"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-right"
      duration={4000}
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-teal-500 dark:text-teal-400" />,
        info: <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />,
        warning: <TriangleAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
        error: <OctagonX className="h-4 w-4 text-rose-500 dark:text-rose-400" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin text-zinc-500" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "font-noto rounded-2xl border-2 shadow-[0_5px_0_0_rgba(0,0,0,0.07)] !bg-white !border-zinc-200 !text-zinc-800 dark:!bg-zinc-900 dark:!border-zinc-700 dark:!text-zinc-100",
          success:
            "!bg-teal-50 !border-teal-200 !text-teal-800 dark:!bg-teal-950/60 dark:!border-teal-800 dark:!text-teal-200",
          error:
            "!bg-rose-50 !border-rose-200 !text-rose-800 dark:!bg-rose-950/60 dark:!border-rose-800 dark:!text-rose-200",
          warning:
            "!bg-amber-50 !border-amber-200 !text-amber-800 dark:!bg-amber-950/60 dark:!border-amber-800 dark:!text-amber-200",
          info:
            "!bg-zinc-50 !border-zinc-200 !text-zinc-700 dark:!bg-zinc-800/80 dark:!border-zinc-600 dark:!text-zinc-300",
          title: "font-bold text-sm",
          description: "text-sm opacity-80",
          closeButton:
            "!bg-transparent !border-transparent hover:!scale-110 transition-transform",
          actionButton:
            "!rounded-xl !font-bold !bg-primary !text-primary-foreground",
          cancelButton:
            "!rounded-xl !font-bold !bg-zinc-100 !text-zinc-600 dark:!bg-zinc-700 dark:!text-zinc-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
