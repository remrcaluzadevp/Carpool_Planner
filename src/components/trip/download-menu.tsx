import { CalendarPlus, ClipboardCopy, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadCsv, downloadIcs, downloadText, summaryText } from '@/lib/downloads'
import type { TripBoard } from '@/lib/types'

export function DownloadMenu({ board, shareUrl }: { board: TripBoard; shareUrl: string }) {
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText(board, shareUrl))
      toast.success('Trip summary copied — paste it in the group chat')
    } catch {
      toast.error('Could not copy. Try “Text summary” to download it instead.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-accent text-accent-foreground shadow-[0_3px_0_var(--primary)] hover:bg-accent/90 active:translate-y-0.5 active:shadow-none">
          <Download /> Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Download trip
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => downloadCsv(board)}>
          <FileSpreadsheet /> Roster spreadsheet (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcs(board, shareUrl)}>
          <CalendarPlus /> Calendar invite (.ics)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(() => window.print(), 50)}>
          <Printer /> Trip sheet (print / PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadText(board, shareUrl)}>
          <FileText /> Text summary (.txt)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copySummary}>
          <ClipboardCopy /> Copy for group chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
