import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "./components/sheet";

import "../index.css";



type SheetDemoProps = {
  side?: React.ComponentProps<typeof SheetContent>["side"];
};

const SheetDemo = ({ side = "right" }: SheetDemoProps) =>
  React.createElement(
    Sheet,
    null,
    React.createElement(
      SheetTrigger,
      { className: "px-4 py-2 bg-blue-500 text-white rounded" },
      "Open Sheet"
    ),
    React.createElement(
      SheetContent,
      { side },
      React.createElement(
        SheetHeader,
        null,
        React.createElement(SheetTitle, null, "Default Sheet"),
        React.createElement(
          SheetDescription,
          null,
          "This is the default sheet example."
        )
      ),
      React.createElement(
        "div",
        { className: "py-4" },
        "Place any content here…"
      ),
      React.createElement(
        SheetFooter,
        null,
        React.createElement(
          SheetClose,
          { className: "px-4 py-2 rounded bg-gray-200" },
          "Close"
        )
      )
    )
  );

const meta = {
  title: "Components/Sheet",
  component: SheetDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    side: {
      control: "radio",
      options: ["left", "right", "top", "bottom"],
    },
  },
} satisfies Meta<typeof SheetDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    side: "right",
  },
};

export const LeftSide: Story = {
  args: {
    side: "left",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: (args) =>
    React.createElement(
      Sheet,
      null,
      React.createElement(
        SheetTrigger,
        { className: "px-4 py-2 bg-blue-500 text-white rounded" },
        "Open Left Sheet"
      ),
      React.createElement(
        SheetContent,
        { side: args.side },
        React.createElement(
          SheetHeader,
          null,
          React.createElement(SheetTitle, null, "Left Side"),
          React.createElement(
            SheetDescription,
            null,
            "This sheet slides in from the left side."
          )
        )
      )
    ),
};

export const Bottom: Story = {
  args: {
    side: "bottom",
  },
};
