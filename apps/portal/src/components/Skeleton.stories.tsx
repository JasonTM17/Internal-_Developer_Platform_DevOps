import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CardSkeleton, TableSkeleton, StatSkeleton } from './Skeleton';

const meta: Meta = { title: 'Components/Skeleton' };
export default meta;

export const Card: StoryObj = { render: () => <CardSkeleton /> };
export const Table: StoryObj = { render: () => <TableSkeleton rows={5} /> };
export const Stat: StoryObj = { render: () => <StatSkeleton /> };
