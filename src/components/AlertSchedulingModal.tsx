import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar, CalendarDays } from 'lucide-react';

interface AlertSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: AlertSchedule) => void;
  currentSchedule?: AlertSchedule;
  title?: string;
  description?: string;
  note?: string;
  frequencyDescriptions?: {
    daily?: string;
    weekly?: string;
    monthly?: string;
  };
}

export interface AlertSchedule {
  frequencies: ('daily' | 'weekly' | 'monthly')[];
  scheduleDay?: number; // 0-6 for weekly (Sunday = 0)
  scheduleDate?: number; // 1-31 for monthly
  scheduleTime: string; // HH:MM format
  // Separate times for each frequency type
  dailyTime?: string;
  weeklyTime?: string;
  monthlyTime?: string;
}

const AlertSchedulingModal: React.FC<AlertSchedulingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSchedule,
  title = "Stock Alert Schedule",
  description = "Choose how often you want to receive stock level alerts.",
  note = "Note: You will still receive immediate alerts when stock levels drop, regardless of your scheduled preferences.",
  frequencyDescriptions = {
    daily: "Get a daily summary of low stock items",
    weekly: "Get a weekly summary on your chosen day",
    monthly: "Get a monthly summary on your chosen date"
  }
}) => {
  const [frequencies, setFrequencies] = useState<('daily' | 'weekly' | 'monthly')[]>(['daily']);
  const [scheduleDay, setScheduleDay] = useState<number>(1); // Monday
  const [scheduleDate, setScheduleDate] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [dailyTime, setDailyTime] = useState<string>('09:00');
  const [weeklyTime, setWeeklyTime] = useState<string>('09:00');
  const [monthlyTime, setMonthlyTime] = useState<string>('09:00');

  const setStateFromSchedule = (schedule?: AlertSchedule) => {
    if (schedule && schedule.frequencies.length > 0) {
      setFrequencies(schedule.frequencies);
      setScheduleDay(schedule.scheduleDay ?? 1);
      setScheduleDate(schedule.scheduleDate ?? 1);
      setScheduleTime(schedule.scheduleTime ?? '09:00');
      setDailyTime(schedule.dailyTime ?? schedule.scheduleTime ?? '09:00');
      setWeeklyTime(schedule.weeklyTime ?? schedule.scheduleTime ?? '09:00');
      setMonthlyTime(schedule.monthlyTime ?? schedule.scheduleTime ?? '09:00');
    } else {
      setFrequencies(['daily']);
      setScheduleDay(1);
      setScheduleDate(1);
      setScheduleTime('09:00');
      setDailyTime('09:00');
      setWeeklyTime('09:00');
      setMonthlyTime('09:00');
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStateFromSchedule(currentSchedule);
    }
  }, [isOpen, currentSchedule]);

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const monthDays = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const getOrdinalSuffix = (num: number) => {
      const j = num % 10;
      const k = num % 100;
      if (j === 1 && k !== 11) return num + "st";
      if (j === 2 && k !== 12) return num + "nd";
      if (j === 3 && k !== 13) return num + "rd";
      return num + "th";
    };
    return { value: day, label: getOrdinalSuffix(day) };
  });

  const handleFrequencyChange = (freq: 'daily' | 'weekly' | 'monthly', checked: boolean) => {
    if (checked) {
      setFrequencies(prev => [...prev, freq]);
    } else {
      setFrequencies(prev => prev.filter(f => f !== freq));
    }
  };

  const handleSave = () => {
    if (frequencies.length === 0) {
      alert('Please select at least one alert frequency');
      return;
    }

    const schedule: AlertSchedule = {
      frequencies,
      scheduleTime,
      dailyTime,
      weeklyTime,
      monthlyTime,
    };

    if (frequencies.includes('weekly')) {
      schedule.scheduleDay = scheduleDay;
    }
    if (frequencies.includes('monthly')) {
      schedule.scheduleDate = scheduleDate;
    }

    onSave(schedule);
    onClose();
  };

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'daily':
        return frequencyDescriptions.daily || 'Get a daily summary of low stock items';
      case 'weekly':
        return frequencyDescriptions.weekly || 'Get a weekly summary on your chosen day';
      case 'monthly':
        return frequencyDescriptions.monthly || 'Get a monthly summary on your chosen date';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            <br />
            <span className="text-sm text-muted-foreground">
              {note}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Alert Frequency</Label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="daily" 
                  checked={frequencies.includes('daily')}
                  onCheckedChange={(checked) => handleFrequencyChange('daily', checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="daily" className="cursor-pointer">
                    <div className="font-medium">Daily</div>
                    <div className="text-sm text-muted-foreground">
                      {getFrequencyDescription('daily')}
                    </div>
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="weekly" 
                  checked={frequencies.includes('weekly')}
                  onCheckedChange={(checked) => handleFrequencyChange('weekly', checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="weekly" className="cursor-pointer">
                    <div className="font-medium">Weekly</div>
                    <div className="text-sm text-muted-foreground">
                      {getFrequencyDescription('weekly')}
                    </div>
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="monthly" 
                  checked={frequencies.includes('monthly')}
                  onCheckedChange={(checked) => handleFrequencyChange('monthly', checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="monthly" className="cursor-pointer">
                    <div className="font-medium">Monthly</div>
                    <div className="text-sm text-muted-foreground">
                      {getFrequencyDescription('monthly')}
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {frequencies.includes('weekly') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Day of the Week
              </Label>
              <Select value={scheduleDay.toString()} onValueChange={(value) => setScheduleDay(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequencies.includes('monthly') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Day of the Month
              </Label>
              <Select value={scheduleDate.toString()} onValueChange={(value) => setScheduleDate(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthDays.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequencies.includes('daily') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Daily Alert Time
              </Label>
              <Input
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {frequencies.includes('weekly') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Weekly Alert Time
              </Label>
              <Input
                type="time"
                value={weeklyTime}
                onChange={(e) => setWeeklyTime(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {frequencies.includes('monthly') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Monthly Alert Time
              </Label>
              <Input
                type="time"
                value={monthlyTime}
                onChange={(e) => setMonthlyTime(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertSchedulingModal;
