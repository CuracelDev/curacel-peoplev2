'use client'

import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/lib/trpc-client'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Play, Pause, Trash2, Download, Terminal as TerminalIcon, RefreshCcw } from 'lucide-react'

export default function SystemLogsPage() {
    const [isStreaming, setIsStreaming] = useState(true)
    const [lines, setLines] = useState(100)
    const [selectedService, setSelectedService] = useState<string>('all')
    const [autoScroll, setAutoScroll] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Fetch services
    const { data: services } = trpc.system.getServices.useQuery()

    // Fetch logs
    const { data, refetch, isFetching } = trpc.system.getLogs.useQuery(
        {
            lines,
            service: selectedService === 'all' ? undefined : selectedService
        },
        {
            refetchInterval: isStreaming ? 3000 : false,
            enabled: true,
        }
    )

    const logs = data?.logs || ''
    const success = data?.success ?? true

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs, autoScroll])

    const downloadLogs = () => {
        const blob = new Blob([logs], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `system-logs-${new Date().toISOString()}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <SettingsPageHeader
                title="System Logs"
                description="Live stream of Docker container logs from the server."
                backHref="/settings"
            />

            <Card className="flex-1 flex flex-col min-h-0 bg-slate-950 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 space-y-0 py-4">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <TerminalIcon className="h-5 w-5 text-indigo-400" />
                            Console Output
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant={success ? 'outline' : 'destructive'} className={success ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' : ''}>
                                {success ? 'Connected' : 'Error'}
                            </Badge>
                            {isFetching && (
                                <RefreshCcw className="h-3 w-3 animate-spin text-slate-500" />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <Select value={selectedService} onValueChange={setSelectedService}>
                                <SelectTrigger className="w-[140px] h-8 bg-transparent border-0 text-slate-300 focus:ring-0">
                                    <SelectValue placeholder="All Services" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    <SelectItem value="all">All Services</SelectItem>
                                    {services?.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={String(lines)} onValueChange={(v) => setLines(Number(v))}>
                                <SelectTrigger className="w-[100px] h-8 bg-transparent border-0 text-slate-300 focus:ring-0">
                                    <SelectValue placeholder="Lines" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    <SelectItem value="100">100 lines</SelectItem>
                                    <SelectItem value="500">500 lines</SelectItem>
                                    <SelectItem value="1000">1000 lines</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-8 w-px bg-slate-800 mx-1" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className={isStreaming ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'}
                            onClick={() => setIsStreaming(!isStreaming)}
                            title={isStreaming ? 'Pause Streaming' : 'Start Streaming'}
                        >
                            {isStreaming ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-slate-100"
                            onClick={() => setAutoScroll(!autoScroll)}
                            title={autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
                        >
                            <RefreshCcw className={autoScroll ? 'h-5 w-5' : 'h-5 w-5 opacity-40'} />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-slate-100"
                            onClick={downloadLogs}
                            title="Download Logs"
                        >
                            <Download className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden relative">
                    <div
                        ref={scrollRef}
                        className="h-full overflow-y-auto p-4 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
                    >
                        <pre className="text-slate-300 whitespace-pre-wrap break-all">
                            {logs || 'Waiting for logs...'}
                        </pre>
                    </div>

                    {isStreaming && (
                        <div className="absolute bottom-4 right-8">
                            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600/90 text-white text-[10px] uppercase tracking-widest font-bold rounded-full animate-pulse shadow-lg shadow-indigo-900/40">
                                <div className="h-1.5 w-1.5 bg-white rounded-full" />
                                Live
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-2">
                <div className="flex gap-4">
                    <span>HOST: {typeof window !== 'undefined' ? window.location.hostname : '-'}</span>
                    <span>TIMESTAMP: {new Date().toISOString()}</span>
                </div>
                <div>
                    PRESS [CMD+F] TO SEARCH
                </div>
            </div>
        </div>
    )
}
