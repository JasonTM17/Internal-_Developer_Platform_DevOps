import React from 'react';
import type { Preview } from '@storybook/react';
import { ThemeContextProvider } from '../src/theme/ThemeContext';

const preview: Preview = {
  decorators: [(Story) => <ThemeContextProvider><Story /></ThemeContextProvider>],
  parameters: {
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#0d1117' }, { name: 'light', value: '#f6f8fa' }] },
  },
};

export default preview;
