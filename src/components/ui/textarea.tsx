import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full min-w-0 rounded-md border border-input bg-superficie-elevada px-3 py-2.5 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-150 outline-none placeholder:text-texto-terciario hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-superficie-2 disabled:text-muted-foreground disabled:hover:border-border aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
