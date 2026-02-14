import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

interface TimePickerProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [selectedHour, selectedMinute] = value.split(':').map(Number) || [20, 0]

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5) // Steps of 5 minutes: 00, 05, 10...

    const formatTime = (h: number, m: number) => {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    const handleSelect = (h: number, m: number) => {
        onChange(formatTime(h, m))
        // Keep open for easy adjustments or close? Let's keep open if improving UX, but usually pickers close.
        // Let's NOT close immediately so they can adjust both hour and minute
    }

    // Scroll to selected
    useEffect(() => {
        if (isOpen) {
            // Logic to scroll could be added here
        }
    }, [isOpen])

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800/50'}`}
            >
                <span className="font-mono text-sm tracking-wider">{value}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 top-full left-0 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-scale-in flex h-48">
                    {/* Hours Column */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide border-r border-slate-800">
                        <div className="sticky top-0 bg-slate-900/90 backdrop-blur text-[9px] font-bold text-slate-500 text-center py-1 border-b border-slate-800">
                            HORA
                        </div>
                        {hours.map(h => (
                            <button
                                key={h}
                                type="button"
                                onClick={() => handleSelect(h, selectedMinute)}
                                className={`w-full py-1.5 text-xs font-mono transition-colors ${h === selectedHour ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                {h.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>

                    {/* Minutes Column */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                         <div className="sticky top-0 bg-slate-900/90 backdrop-blur text-[9px] font-bold text-slate-500 text-center py-1 border-b border-slate-800">
                            MIN
                        </div>
                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => handleSelect(selectedHour, m)}
                                className={`w-full py-1.5 text-xs font-mono transition-colors ${m === selectedMinute ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                {m.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
