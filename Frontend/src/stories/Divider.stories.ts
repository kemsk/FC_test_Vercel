import type { Meta, StoryObj } from '@storybook/react-vite';


import { Divider } from './components/divider';
import "../index.css";

const meta: Meta<typeof Divider> = {
  title: "Component/Divider",
  component: Divider,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: { type: "radio" },
      options: ["horizontal", "vertical"],
    },
    className: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

// Default horizontal divider
export const Default: Story = {
  args: {
    orientation: "horizontal",
  },
};
