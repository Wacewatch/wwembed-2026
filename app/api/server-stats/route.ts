import { NextResponse } from "next/server"
import os from "os"

export async function GET() {
  try {
    // CPU usage calculation
    const cpus = os.cpus()
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
        const idle = cpu.times.idle
        return acc + ((total - idle) / total) * 100
      }, 0) / cpus.length

    // Memory info
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPercentage = (usedMem / totalMem) * 100

    // For disk, we'll estimate based on available info
    // In a real deployment, you'd use a library like 'check-disk-space'
    const diskTotal = 50 * 1024 * 1024 * 1024 // Estimate 50GB
    const diskUsed = 20 * 1024 * 1024 * 1024 // Estimate 20GB used
    const diskPercentage = (diskUsed / diskTotal) * 100

    const stats = {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
      },
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: memPercentage,
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percentage: diskPercentage,
      },
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error getting server stats:", error)
    return NextResponse.json({ error: "Failed to get server stats" }, { status: 500 })
  }
}
