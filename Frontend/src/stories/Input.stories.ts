import type { Meta, StoryObj } from '@storybook/react-vite';


import { Input } from './components/input';
import "../index.css";

const meta: Meta<typeof Input> = {
  title: "Component/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "Enter text...",
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: "Hello World",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Input disabled",
  },
};
