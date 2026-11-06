import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-superficie-elevada px-3 py-2 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-150 outline-none placeholder:text-texto-terciario hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-superficie-2 disabled:text-muted-foreground disabled:hover:border-border aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive md:text-sm file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
