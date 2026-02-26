"use client"

import { Bell, HelpCircle, ChevronDown, User, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Header() {
  return (
    <header
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: "52px",
        backgroundColor: "#2A8BA8",
        borderBottom: "3px solid #C05A2C",
        zIndex: 50,
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center font-bold text-white text-sm rounded"
            style={{
              width: 28,
              height: 28,
              backgroundColor: "#C05A2C",
              fontFamily: "system-ui",
            }}
          >
            R
          </div>
          <div className="leading-none">
            <div
              className="text-white font-semibold text-[15px] leading-tight"
              style={{ fontFamily: "Source Serif 4, Georgia, serif" }}
            >
              REPrieve.ai™
            </div>
            <div className="text-white/70 text-[10px] font-medium tracking-wide uppercase leading-tight">
              Compliance OS
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-white/25" />

        {/* Org name */}
        <span className="text-white/90 text-sm font-medium">
          Cholla Behavioral Health
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Help */}
        <button className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors cursor-pointer">
          <HelpCircle size={15} />
          <span>Help</span>
        </button>

        {/* Notification bell */}
        <button className="relative text-white/80 hover:text-white transition-colors cursor-pointer p-1">
          <Bell size={18} />
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-white font-bold text-[10px] rounded-full"
            style={{ width: 16, height: 16, backgroundColor: "#DC2626", lineHeight: 1 }}
          >
            3
          </span>
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors cursor-pointer focus:outline-none">
              <Avatar style={{ width: 28, height: 28 }}>
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ backgroundColor: "#1E7A96", color: "white" }}
                >
                  SR
                </AvatarFallback>
              </Avatar>
              <div className="text-left leading-none">
                <div className="text-sm font-medium">Sarah R.</div>
                <div className="text-white/60 text-[11px]">Compliance</div>
              </div>
              <ChevronDown size={14} className="text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <div className="text-sm font-semibold">Sarah Reynolds</div>
              <div
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium mt-1"
                style={{ backgroundColor: "#E8F6FA", color: "#2A8BA8" }}
              >
                Compliance Officer
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User size={14} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings size={14} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
              <LogOut size={14} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
