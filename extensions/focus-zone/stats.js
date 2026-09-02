// Focus Zone Statistics Manager

class StatsManager {
  constructor() {
    this.storageKey = 'stats';
  }

  // Get today's date string
  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  // Get week number
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  // Get current week key
  getWeekKey() {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  // Format time in hours and minutes
  formatTime(seconds) {
    if (!seconds || seconds < 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  // Record a focus session
  async recordFocusSession(durationSeconds) {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        const stats = result[this.storageKey] || {
          daily: {},
          weekly: {},
          allTime: 0,
          streak: 0,
          lastFocusDate: null,
          hourlyStats: {}
        };

        const today = this.getToday();
        const weekKey = this.getWeekKey();
        const currentHour = new Date().getHours();

        // Update daily stats
        if (!stats.daily[today]) {
          stats.daily[today] = 0;
        }
        stats.daily[today] += durationSeconds;

        // Update weekly stats
        if (!stats.weekly[weekKey]) {
          stats.weekly[weekKey] = 0;
        }
        stats.weekly[weekKey] += durationSeconds;

        // Update all time
        stats.allTime += durationSeconds;

        // Update hourly stats
        if (!stats.hourlyStats[currentHour]) {
          stats.hourlyStats[currentHour] = 0;
        }
        stats.hourlyStats[currentHour] += durationSeconds;

        // Update streak
        if (stats.lastFocusDate) {
          const lastDate = new Date(stats.lastFocusDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            stats.streak++;
          } else if (diffDays > 1) {
            stats.streak = 1;
          }
        } else {
          stats.streak = 1;
        }
        stats.lastFocusDate = today;

        // Clean up old data (keep last 90 days)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        Object.keys(stats.daily).forEach(date => {
          if (date < cutoffStr) {
            delete stats.daily[date];
          }
        });

        // Clean up old weekly data (keep last 12 weeks)
        const cutoffWeek = this.getWeekKey();
        const cutoffWeekNum = parseInt(cutoffWeek.split('-W')[1]);
        Object.keys(stats.weekly).forEach(week => {
          const weekNum = parseInt(week.split('-W')[1]);
          if (weekNum < cutoffWeekNum - 12 && week.split('-W')[0] === cutoffWeek.split('-W')[0]) {
            delete stats.weekly[week];
          }
        });

        chrome.storage.local.set({ [this.storageKey]: stats }, () => {
          resolve(stats);
        });
      });
    });
  }

  // Get today's focus time in seconds
  getTodayFocus(stats) {
    const today = this.getToday();
    return stats.daily?.[today] || 0;
  }

  // Get this week's focus time in seconds
  getWeekFocus(stats) {
    const weekKey = this.getWeekKey();
    return stats.weekly?.[weekKey] || 0;
  }

  // Calculate current streak
  calculateStreak(stats) {
    return stats.streak || 0;
  }

  // Get most productive hour
  getMostProductiveHour(stats) {
    const hourlyStats = stats.hourlyStats || {};
    let maxHour = 0;
    let maxValue = 0;
    
    Object.entries(hourlyStats).forEach(([hour, value]) => {
      if (value > maxValue) {
        maxValue = value;
        maxHour = parseInt(hour);
      }
    });
    
    return { hour: maxHour, seconds: maxValue };
  }

  // Get hourly distribution for visualization
  getHourlyDistribution(stats) {
    const hourlyStats = stats.hourlyStats || {};
    const distribution = new Array(24).fill(0);
    
    Object.entries(hourlyStats).forEach(([hour, value]) => {
      distribution[parseInt(hour)] = value;
    });
    
    return distribution;
  }

  // Get daily trend (last 30 days)
  getDailyTrend(stats) {
    const trend = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      trend.push({
        date: dateStr,
        seconds: stats.daily?.[dateStr] || 0
      });
    }
    
    return trend;
  }

  // Export statistics as CSV
  exportCSV(stats) {
    const rows = [
      ['Date', 'Focus Time (minutes)', 'Sessions']
    ];

    // Daily data
    const dailyEntries = Object.entries(stats.daily || {}).sort(([a], [b]) => a.localeCompare(b));
    dailyEntries.forEach(([date, seconds]) => {
      rows.push([date, Math.round(seconds / 60), '']);
    });

    // Add summary row
    rows.push([]);
    rows.push(['Summary', '', '']);
    rows.push(['Total Focus Time', this.formatTime(stats.allTime || 0), '']);
    rows.push(['Current Streak', `${stats.streak || 0} days`, '']);
    
    const mostProductive = this.getMostProductiveHour(stats);
    rows.push(['Most Productive Hour', `${mostProductive.hour}:00`, '']);

    // Create CSV content
    const csvContent = rows.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focus-zone-stats-${this.getToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Get visualization-ready data
  getVisualizationData(stats) {
    return {
      summary: {
        totalTime: stats.allTime || 0,
        streak: stats.streak || 0,
        todayTime: this.getTodayFocus(stats),
        weekTime: this.getWeekFocus(stats)
      },
      hourlyDistribution: this.getHourlyDistribution(stats),
      dailyTrend: this.getDailyTrend(stats),
      mostProductiveHour: this.getMostProductiveHour(stats)
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsManager;
}
