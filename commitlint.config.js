module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']],
    'scope-enum': [1, 'always', ['api', 'portal', 'cli', 'shared', 'config', 'ui', 'terraform', 'k8s', 'helm', 'argocd', 'docker', 'ci', 'monitoring', 'security', 'db', 'deps']],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
