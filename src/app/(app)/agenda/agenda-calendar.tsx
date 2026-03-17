"use client"

import { useState } from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"
import "./agenda-calendar.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgendaDrawer } from "./agenda-drawer"
import type { WorkoutEvent, Template } from "./page"

type Props = {
  events: WorkoutEvent[]
  templates: Template[]
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth() &&
    a.getUTCDate()     === b.getUTCDate()
  )
}

function toUTCDate(localDate: Date) {
  return new Date(Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate()
  ))
}

export function AgendaCalendar({ events, templates }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleDayClick(value: Date) {
    const utcDate = toUTCDate(value)
    setSelectedDate(utcDate)
    setDrawerOpen(true)
  }

  function getEventsForDate(date: Date) {
    return events.filter(e => isSameDay(new Date(e.scheduledAt), date))
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <>
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Calendrier</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cliquez sur un jour pour voir ou planifier une séance
          </p>
        </CardHeader>
        <CardContent>
          <div className="agenda-cal">
            <Calendar
              locale="fr-FR"
              onClickDay={handleDayClick}
              tileContent={({ date, view }) => {
                if (view !== "month") return null
                const utc = toUTCDate(date)
                const dayEvents = getEventsForDate(utc)
                if (dayEvents.length === 0) return null
                return (
                  <div className="flex justify-center mt-1 gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-orange-500"
                      />
                    ))}
                  </div>
                )
              }}
            />
          </div>
        </CardContent>
      </Card>

      <AgendaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        date={selectedDate}
        events={selectedEvents}
        templates={templates}
      />
    </>
  )
}
