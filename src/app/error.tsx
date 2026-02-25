'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error boundary caught an error:', error)
    }, [error])

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 w-full h-full bg-background relative z-50">
            <div className="text-center max-w-lg w-full bg-card p-6 sm:p-10 rounded-2xl border shadow-sm mx-auto">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="h-8 w-8" />
                </div>

                <h2 className="text-2xl font-bold mb-3 text-card-foreground">Something went wrong</h2>

                <div className="bg-muted p-4 rounded-lg text-left mb-6 overflow-hidden">
                    <p className="text-sm font-mono text-muted-foreground break-words line-clamp-3">
                        {error.message || 'An unexpected client-side error occurred.'}
                    </p>
                </div>

                <p className="text-muted-foreground mb-8 text-sm">
                    The application encountered an unexpected issue while loading this page. You can try reloading, going back to the previous page, or returning to the dashboard.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button onClick={() => reset()} className="w-full sm:w-auto">
                        Try Again
                    </Button>
                    <Button asChild variant="default" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
