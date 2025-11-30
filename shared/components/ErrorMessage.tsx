interface ErrorMessageProps {
  message: string
  title?: string
  onRetry?: () => void
}

export function ErrorMessage({ message, title = 'Error', onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 className="font-semibold text-red-800">{title}</h3>
      <p className="text-sm text-red-600 mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
