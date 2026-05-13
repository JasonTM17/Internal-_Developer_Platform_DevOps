/**
 * Deployment State Machine
 *
 * Defines the valid states and transitions for a deployment lifecycle.
 * Ensures deployments follow a predictable, auditable progression.
 *
 * State diagram:
 *
 *   pending_approval → queued → in_progress → verifying → completed
 *                        ↓          ↓            ↓
 *                    cancelled    failed      failed
 *                                   ↓
 *                              rolling_back → rolled_back
 *                                   ↓
 *                              rollback_failed
 */

/** All possible deployment states. */
export type DeploymentState =
  | 'pending_approval'
  | 'queued'
  | 'in_progress'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolling_back'
  | 'rolled_back'
  | 'rollback_failed';

/** Triggers that cause state transitions. */
export type DeploymentTrigger =
  | 'approve'
  | 'reject'
  | 'start'
  | 'progress'
  | 'verify'
  | 'complete'
  | 'fail'
  | 'cancel'
  | 'rollback'
  | 'rollback_complete'
  | 'rollback_fail'
  | 'timeout';

/** A state transition definition. */
export interface DeploymentTransition {
  from: DeploymentState;
  to: DeploymentState;
  trigger: DeploymentTrigger;
}

/** Transition guard function - returns true if transition is allowed. */
export type TransitionGuard = (context: TransitionContext) => boolean;

/** Context passed to transition guards and hooks. */
export interface TransitionContext {
  deploymentId: string;
  currentState: DeploymentState;
  targetState: DeploymentState;
  trigger: DeploymentTrigger;
  actor?: string;
  metadata?: Record<string, unknown>;
}

/** Hook function called on state entry/exit. */
export type StateHook = (context: TransitionContext) => void | Promise<void>;

/**
 * Valid state transitions map.
 * Defines which transitions are allowed from each state.
 */
const VALID_TRANSITIONS: ReadonlyArray<DeploymentTransition> = [
  // From pending_approval
  { from: 'pending_approval', to: 'queued', trigger: 'approve' },
  { from: 'pending_approval', to: 'cancelled', trigger: 'reject' },
  { from: 'pending_approval', to: 'cancelled', trigger: 'cancel' },

  // From queued
  { from: 'queued', to: 'in_progress', trigger: 'start' },
  { from: 'queued', to: 'cancelled', trigger: 'cancel' },
  { from: 'queued', to: 'failed', trigger: 'timeout' },

  // From in_progress
  { from: 'in_progress', to: 'verifying', trigger: 'verify' },
  { from: 'in_progress', to: 'completed', trigger: 'complete' },
  { from: 'in_progress', to: 'failed', trigger: 'fail' },
  { from: 'in_progress', to: 'cancelled', trigger: 'cancel' },
  { from: 'in_progress', to: 'failed', trigger: 'timeout' },

  // From verifying
  { from: 'verifying', to: 'completed', trigger: 'complete' },
  { from: 'verifying', to: 'failed', trigger: 'fail' },
  { from: 'verifying', to: 'failed', trigger: 'timeout' },

  // From failed (can trigger rollback)
  { from: 'failed', to: 'rolling_back', trigger: 'rollback' },

  // From rolling_back
  { from: 'rolling_back', to: 'rolled_back', trigger: 'rollback_complete' },
  { from: 'rolling_back', to: 'rollback_failed', trigger: 'rollback_fail' },
  { from: 'rolling_back', to: 'rollback_failed', trigger: 'timeout' },
];

/** Terminal states - no further transitions allowed. */
const TERMINAL_STATES: ReadonlySet<DeploymentState> = new Set([
  'completed',
  'cancelled',
  'rolled_back',
  'rollback_failed',
]);

/**
 * Deployment State Machine
 *
 * Manages the lifecycle state of a single deployment.
 * Enforces valid transitions and provides hooks for side effects.
 */
export class DeploymentStateMachine {
  private currentState: DeploymentState;
  private readonly history: Array<{ from: DeploymentState; to: DeploymentState; trigger: DeploymentTrigger; timestamp: Date }> = [];
  private readonly guards: Map<string, TransitionGuard> = new Map();
  private readonly onEnterHooks: Map<DeploymentState, StateHook[]> = new Map();
  private readonly onExitHooks: Map<DeploymentState, StateHook[]> = new Map();

  constructor(initialState: DeploymentState = 'queued') {
    this.currentState = initialState;
  }

  /**
   * Get the current state.
   */
  getState(): DeploymentState {
    return this.currentState;
  }

  /**
   * Check if the state machine is in a terminal state.
   */
  isTerminal(): boolean {
    return TERMINAL_STATES.has(this.currentState);
  }

  /**
   * Get the transition history.
   */
  getHistory(): ReadonlyArray<{ from: DeploymentState; to: DeploymentState; trigger: DeploymentTrigger; timestamp: Date }> {
    return this.history;
  }

  /**
   * Check if a specific transition is valid from the current state.
   */
  canTransition(transition: DeploymentTransition): boolean {
    return VALID_TRANSITIONS.some(
      (t) => t.from === this.currentState && t.to === transition.to && t.trigger === transition.trigger,
    );
  }

  /**
   * Get all valid transitions from the current state.
   */
  getAvailableTransitions(): DeploymentTransition[] {
    return VALID_TRANSITIONS.filter((t) => t.from === this.currentState);
  }

  /**
   * Get all valid triggers from the current state.
   */
  getAvailableTriggers(): DeploymentTrigger[] {
    return this.getAvailableTransitions().map((t) => t.trigger);
  }

  /**
   * Execute a state transition.
   *
   * @throws {InvalidTransitionError} if the transition is not valid
   */
  transition(transition: DeploymentTransition): void {
    if (!this.canTransition(transition)) {
      throw new InvalidTransitionError(this.currentState, transition.to, transition.trigger);
    }

    const previousState = this.currentState;
    this.currentState = transition.to;

    this.history.push({
      from: previousState,
      to: transition.to,
      trigger: transition.trigger,
      timestamp: new Date(),
    });
  }

  /**
   * Attempt a transition by trigger name.
   * Finds the appropriate target state automatically.
   *
   * @throws {InvalidTransitionError} if no valid transition exists for the trigger
   */
  trigger(triggerName: DeploymentTrigger): DeploymentState {
    const validTransition = VALID_TRANSITIONS.find(
      (t) => t.from === this.currentState && t.trigger === triggerName,
    );

    if (!validTransition) {
      throw new InvalidTransitionError(this.currentState, 'unknown' as DeploymentState, triggerName);
    }

    this.transition(validTransition);
    return this.currentState;
  }

  /**
   * Register a guard function for a specific transition.
   * Guards can prevent transitions even if they are structurally valid.
   */
  addGuard(from: DeploymentState, to: DeploymentState, guard: TransitionGuard): void {
    this.guards.set(`${from}->${to}`, guard);
  }

  /**
   * Register a hook to be called when entering a state.
   */
  onEnter(state: DeploymentState, hook: StateHook): void {
    if (!this.onEnterHooks.has(state)) {
      this.onEnterHooks.set(state, []);
    }
    this.onEnterHooks.get(state)!.push(hook);
  }

  /**
   * Register a hook to be called when exiting a state.
   */
  onExit(state: DeploymentState, hook: StateHook): void {
    if (!this.onExitHooks.has(state)) {
      this.onExitHooks.set(state, []);
    }
    this.onExitHooks.get(state)!.push(hook);
  }

  /**
   * Reset the state machine to a specific state (for recovery scenarios).
   */
  reset(state: DeploymentState): void {
    this.currentState = state;
    this.history.length = 0;
  }
}

/**
 * Error thrown when an invalid state transition is attempted.
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: DeploymentState,
    public readonly to: DeploymentState,
    public readonly trigger: DeploymentTrigger,
  ) {
    super(
      `Invalid transition: cannot move from '${from}' to '${to}' via trigger '${trigger}'`,
    );
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Get a human-readable description of a deployment state.
 */
export function getStateDescription(state: DeploymentState): string {
  const descriptions: Record<DeploymentState, string> = {
    pending_approval: 'Waiting for manual approval',
    queued: 'Queued for execution',
    in_progress: 'Deployment in progress',
    verifying: 'Verifying deployment health',
    completed: 'Deployment completed successfully',
    failed: 'Deployment failed',
    cancelled: 'Deployment was cancelled',
    rolling_back: 'Rolling back to previous version',
    rolled_back: 'Successfully rolled back',
    rollback_failed: 'Rollback failed - manual intervention required',
  };
  return descriptions[state];
}

/**
 * Check if a state is a terminal (final) state.
 */
export function isTerminalState(state: DeploymentState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Get all valid transitions for visualization/documentation.
 */
export function getAllTransitions(): ReadonlyArray<DeploymentTransition> {
  return VALID_TRANSITIONS;
}
