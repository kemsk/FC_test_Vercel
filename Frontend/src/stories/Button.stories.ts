import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Button } from "./components/button"
import "../index.css"


const meta = {
  title: "component/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
        "icon", 
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "mobileLarge"],
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/* Stories */

export const Default: Story = {
  args: {
    children: "Button",
  },
}

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
}

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Button",
  },
}

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Button",
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
}

export const MobileLarge: Story = {
  args: {
    size: "mobileLarge",
    children: "Mobile Large",
  },
}


export const IconSmall: Story = {
  args: {
    variant: "icon",
    size: "sm",
    children: "S",
  },
}

export const IconDefault: Story = {
  args: {
    variant: "icon",
    size: "default",
    children: "D",
  },
}

export const IconLarge: Story = {
  args: {
    variant: "icon",
    size: "lg",
    children: "L",
  },
}
