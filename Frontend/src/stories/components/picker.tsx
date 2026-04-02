"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "./button"
import { Calendar } from "./calendar"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export type DatePickerProps = {
  buttonClassName?: string;
  containerClassName?: string;
  value?: string;
  onChange?: (value: string) => void;
  fromYear?: number;
  toYear?: number;
};

function parseDateValue(value: string | undefined) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

function toDateValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DatePicker({
  buttonClassName,
  containerClassName,
  value,
  onChange,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [dateUncontrolled, setDateUncontrolled] = React.useState<Date | undefined>(undefined)
  const isControlled = typeof value === "string"
  const date = isControlled ? parseDateValue(value) : dateUncontrolled

  const defaultMonth = React.useMemo(() => {
    if (date) return date;
    if (typeof fromYear === "number" && Number.isFinite(fromYear)) return new Date(fromYear, 0, 1);
    return undefined;
  }, [date, fromYear]);

  React.useEffect(() => {
    if (!isControlled) return
    setDateUncontrolled(parseDateValue(value))
  }, [isControlled, value])

  return (
    <div className={containerClassName ?? "flex flex-col gap-1 "}>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="">
            <Button
                variant="action"
                id="date"
                className={
                  buttonClassName ??
                  "h-10 inline-flex items-center gap-2 font-normal whitespace-nowrap"
                }
            >
            <div className="flex items-center gap-5">
            <img
                src="/GrayCalendarIcon.png"
                alt="Calendar"
                className="h-4 w-4 shrink-0 -ml-1"
            />
            <span className=" flex-1 whitespace-normal break-words text-left leading-tight">
              {date ? date.toLocaleDateString() : "Date"}
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0" />
            </div>
            </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto max-w-[calc(100vw-3rem)] overflow-hidden p-0 border border-primary"
          align="center"
          collisionPadding={24}
        >
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            defaultMonth={defaultMonth}
            onSelect={(date) => {
              if (!date) return
              if (!isControlled) setDateUncontrolled(date)
              onChange?.(toDateValue(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}


export type TimePickerProps = {
  buttonClassName?: string;
  containerClassName?: string;
};

export function TimePicker({ buttonClassName, containerClassName }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState<string | undefined>(undefined)

  const [draftHour, setDraftHour] = React.useState("12")
  const [draftMinute, setDraftMinute] = React.useState("00")
  const [draftPeriod, setDraftPeriod] = React.useState<"AM" | "PM">("AM")

  React.useEffect(() => {
    if (!open) return

    if (!time) {
      setDraftHour("12")
      setDraftMinute("00")
      setDraftPeriod("AM")
      return
    }

    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (match) {
      const [, h, m, p] = match
      setDraftHour(String(Number(h)))
      setDraftMinute(m)
      setDraftPeriod(p.toUpperCase() as "AM" | "PM")
      return
    }

    setDraftHour("12")
    setDraftMinute("00")
    setDraftPeriod("AM")
  }, [open, time])

  const clampHour = (value: string) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ""
    if (numeric < 1) return "1"
    if (numeric > 12) return "12"
    return String(numeric)
  }

  const clampMinute = (value: string) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ""
    if (numeric < 0) return "00"
    if (numeric > 59) return "59"
    return String(numeric).padStart(2, "0")
  }

  return (
    <div className={containerClassName ?? "flex flex-col gap-0"}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="action"
            id="time"
            className={
              buttonClassName ??
              "h-10 w-40 min-w-0 items-start justify-between gap-2 font-normal"
            }
          >
            <div className="flex items-center gap-5">
            <img
              src="/GrayClockIcon.png"
              alt="Clock"
              className="h-4 w-4 shrink-0 -ml-1"
            />
            <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-tight">
              {time ? time : "Time"}
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[320px] max-w-[calc(100vw-3rem)] p-4 text-sm"
          align="center"
          collisionPadding={24}
        >
          <div className="space-y-4">
            <div className="text-sm font-semibold text-foreground">Enter time</div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={draftHour}
                    onChange={(e) => setDraftHour(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    onBlur={() => setDraftHour((v) => clampHour(v || "12"))}
                    className="h-14 w-full rounded-md border border-input bg-background px-3 text-center text-3xl text-foreground outline-none focus:border-ring"
                  />
                  <div className="text-3xl font-bold text-foreground">:</div>
                  <input
                    inputMode="numeric"
                    value={draftMinute}
                    onChange={(e) => setDraftMinute(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    onBlur={() => setDraftMinute((v) => clampMinute(v || "00"))}
                    className="h-14 w-full rounded-md border border-input bg-background px-3 text-center text-3xl text-foreground outline-none focus:border-ring"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Hour</span>
                  <span>Minute</span>
                </div>
              </div>

              <div className="flex flex-col overflow-hidden rounded-md border border-input">
                <button
                  type="button"
                  className={
                    draftPeriod === "AM"
                      ? "h-9 w-12 bg-primary text-primary-foreground text-xs font-semibold"
                      : "h-9 w-12 bg-muted text-muted-foreground text-xs font-semibold"
                  }
                  onClick={() => setDraftPeriod("AM")}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={
                    draftPeriod === "PM"
                      ? "h-9 w-12 bg-primary text-primary-foreground text-xs font-semibold"
                      : "h-9 w-12 bg-muted text-muted-foreground text-xs font-semibold"
                  }
                  onClick={() => setDraftPeriod("PM")}
                >
                  PM
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <img src="/GrayClockIcon.png" alt="Clock" className="h-4 w-4" />
              <div className="flex items-center gap-6">
                <Button
                  type="button"
                  variant={"cancel"}
                  className="text-sm font-semibold text-primary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary"
                  onClick={() => {
                    const h = clampHour(draftHour || "12")
                    const m = clampMinute(draftMinute || "00")
                    setTime(`${h}:${m} ${draftPeriod}`)
                    setOpen(false)
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
