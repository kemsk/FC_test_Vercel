import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';

import { Progress } from './components/progress';
import "../index.css";

const meta: Meta<typeof Progress> = {
  title: "Component/Progress",
  component: Progress,
  args: {
    value: 40,
  },
  argTypes: {
    value: {
      control: { type: "number", min: 0, max: 100, step: 5 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

/* ----------------------------
   Default
----------------------------- */
export const Default: Story = {};

/* ----------------------------
   25%
----------------------------- */
export const Quarter: Story = {
  args: {
    value: 25,
  },
};

/* ----------------------------
   50%
----------------------------- */
export const Half: Story = {
  args: {
    value: 50,
  },
};

/* ----------------------------
   100%
----------------------------- */
export const Complete: Story = {
  args: {
    value: 100,
  },
};

/* ----------------------------
   Mobile View
----------------------------- */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  args: {
    value: 60,
  },
};

/* ----------------------------
   Desktop View
----------------------------- */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
  args: {
    value: 60,
  },
};
