import { useState, useRef, useCallback, useEffect } from "react"

export type TimerStatus = "idle" | "running" | "paused" | "completed"
export type SessionType = "focus" | "break"

export interface SessionBlock {
  type: SessionType
  duration: number // in minutes
}

interface UseTimerReturn {
  status: TimerStatus
  timeLeft: number
  totalTime: number
  progress: number
  minutes: number
  seconds: number
  setMinutes: (m: number) => void
  setSeconds: (s: number) => void
  start: (m?: number, s?: number) => void
  pause: () => void
  resume: () => void
  reset: () => void
  formattedTime: string
  sequence: SessionBlock[]
  currentBlockIndex: number
  startSequence: (seq: SessionBlock[], targetMinutes?: number) => void
  nextBlock: () => void
  totalProgress: number
  totalTargetMinutes: number
  setTotalTargetMinutes: (m: number) => void
  isJourneyFinished: boolean
}

export function useTimer(initialMinutes = 25, initialSeconds = 0): UseTimerReturn {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [seconds, setSecondsState] = useState(initialSeconds)
  const [status, setStatus] = useState<TimerStatus>("idle")
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60 + initialSeconds)
  const [sequence, setSequence] = useState<SessionBlock[]>([])
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1)
  const [totalTargetMinutes, setTotalTargetMinutes] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalTime = minutes * 60 + seconds

  const setSeconds = useCallback((s: number) => {
    if (s >= 0 && s < 60) setSecondsState(s)
  }, [])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearTimer()
        setStatus("completed")
        return 0
      }
      return prev - 1
    })
  }, [clearTimer])

  const start = useCallback((m?: number | any, s?: number | any) => {
    clearTimer()
    const targetMins = typeof m === "number" ? m : minutes
    const targetSecs = typeof s === "number" ? s : seconds
    
    if (typeof m === "number") setMinutes(m)
    if (typeof s === "number") setSecondsState(s)

    const total = targetMins * 60 + targetSecs
    setTimeLeft(total)
    setStatus("running")
    intervalRef.current = setInterval(tick, 1000)
  }, [minutes, seconds, tick, clearTimer])

  const pause = useCallback(() => {
    clearTimer()
    setStatus("paused")
  }, [clearTimer])

  const resume = useCallback(() => {
    setStatus("running")
    intervalRef.current = setInterval(tick, 1000)
  }, [tick])

  const reset = useCallback(() => {
    clearTimer()
    setTimeLeft(minutes * 60 + seconds)
    setStatus("idle")
    setSequence([])
    setCurrentBlockIndex(-1)
    setTotalTargetMinutes(0)
  }, [minutes, seconds, clearTimer])

  const startSequence = useCallback((seq: SessionBlock[], targetMinutes?: number) => {
    if (seq.length === 0) return
    setSequence(seq)
    setCurrentBlockIndex(0)
    setTotalTargetMinutes(targetMinutes || 0)
    const first = seq[0]
    setMinutes(first.duration)
    setSecondsState(0)
    
    clearTimer()
    const total = first.duration * 60
    setTimeLeft(total)
    setStatus("running")
    intervalRef.current = setInterval(tick, 1000)
  }, [tick, clearTimer])

  const nextBlock = useCallback(() => {
    const nextIdx = currentBlockIndex + 1
    if (nextIdx < sequence.length) {
      setCurrentBlockIndex(nextIdx)
      const block = sequence[nextIdx]
      setMinutes(block.duration)
      setSecondsState(0)
      
      clearTimer()
      const total = block.duration * 60
      setTimeLeft(total)
      setStatus("running")
      intervalRef.current = setInterval(tick, 1000)
    } else {
      reset()
    }
  }, [currentBlockIndex, sequence, tick, clearTimer, reset])

  useEffect(() => {
    if (status === "idle") {
      setTimeLeft(minutes * 60 + seconds)
    }
  }, [minutes, seconds, status])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const progress = totalTime > 0 ? 1 - timeLeft / totalTime : 0

  // Calculate total sequence progress
  let totalSequenceProgress = 0
  if (sequence.length > 0 && currentBlockIndex >= 0) {
    const totalDuration = sequence.reduce((acc, b) => acc + b.duration * 60, 0)
    const passedSeconds = sequence.slice(0, currentBlockIndex).reduce((acc, b) => acc + b.duration * 60, 0)
    const currentBlockSecondsPassed = (sequence[currentBlockIndex].duration * 60) - timeLeft
    totalSequenceProgress = (passedSeconds + currentBlockSecondsPassed) / totalDuration
  }

  const displayMins = Math.floor(timeLeft / 60)
  const displaySecs = timeLeft % 60
  const formattedTime = `${displayMins.toString().padStart(2, "0")}:${displaySecs.toString().padStart(2, "0")}`

  return {
    status,
    timeLeft,
    totalTime,
    progress,
    minutes,
    seconds,
    setMinutes,
    setSeconds,
    start,
    pause,
    resume,
    reset,
    formattedTime,
    sequence,
    currentBlockIndex,
    startSequence,
    nextBlock,
    totalProgress: totalSequenceProgress,
    totalTargetMinutes,
    setTotalTargetMinutes,
    isJourneyFinished: sequence.length > 0 && currentBlockIndex === sequence.length - 1 && status === "completed"
  }
}
