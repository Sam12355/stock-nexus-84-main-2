import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface EventReminderSchedule {
  frequencies: string[];
  dailyTime: string;
  weeklyTime: string;
  monthlyTime: string;
  scheduleDay: number | null;
  scheduleDate: number | null;
}

interface EventReminderSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: EventReminderSchedule) => void;
  currentSchedule?: EventReminderSchedule;
}

const EventReminderSchedulingModal: React.FC<EventReminderSchedulingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSchedule,
}) => {
  const [schedule, setSchedule] = useState<EventReminderSchedule>({
    frequencies: currentSchedule?.frequencies || [],
    dailyTime: currentSchedule?.dailyTime || '09:00',
    weeklyTime: currentSchedule?.weeklyTime || '09:00',
    monthlyTime: currentSchedule?.monthlyTime || '09:00',
    scheduleDay: currentSchedule?.scheduleDay || 0,
    scheduleDate: currentSchedule?.scheduleDate || 1,
  });

  useEffect(() => {
    if (isOpen) {
      setSchedule({
        frequencies: currentSchedule?.frequencies || [],
        dailyTime: currentSchedule?.dailyTime || '09:00',
        weeklyTime: currentSchedule?.weeklyTime || '09:00',
        monthlyTime: currentSchedule?.monthlyTime || '09:00',
        scheduleDay: currentSchedule?.scheduleDay ?? 0,
        scheduleDate: currentSchedule?.scheduleDate ?? 1,
      });
    }
  }, [isOpen, currentSchedule]);

  const handleFrequencyChange = (frequency: string, checked: boolean) => {
    if (checked) {
      setSchedule(prev => ({
        ...prev,
        frequencies: [...prev.frequencies, frequency]
      }));
    } else {
      setSchedule(prev => ({
        ...prev,
        frequencies: prev.frequencies.filter(f => f !== frequency)
      }));
    }
  };

  const handleSave = () => {
    if (schedule.frequencies.length === 0) {
      alert('Please select at least one reminder frequency');
      return;
    }

    // Validate that required fields are set for selected frequencies
    if (schedule.frequencies.includes('weekly') && schedule.scheduleDay === null) {
      alert('Please select a day of the week for weekly reminders');
      return;
    }

    if (schedule.frequencies.includes('monthly') && schedule.scheduleDate === null) {
      alert('Please select a day of the month for monthly reminders');
      return;
    }

    onSave(schedule);
    onClose();
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const monthDayOptions = Array.from({ length: 31 }, (_, i) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Event Reminder Schedule</DialogTitle>
          <DialogDescription>
            Configure when you want to receive event reminder notifications. 
            Alerts will be sent until the event date passes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Reminder Frequency</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="daily"
                  checked={schedule.frequencies.includes('daily')}
                  onCheckedChange={(checked) => handleFrequencyChange('daily', checked as boolean)}
                />
                <Label htmlFor="daily" className="text-sm font-normal">
                  Daily reminders
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weekly"
                  checked={schedule.frequencies.includes('weekly')}
                  onCheckedChange={(checked) => handleFrequencyChange('weekly', checked as boolean)}
                />
                <Label htmlFor="weekly" className="text-sm font-normal">
                  Weekly reminders
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="monthly"
                  checked={schedule.frequencies.includes('monthly')}
                  onCheckedChange={(checked) => handleFrequencyChange('monthly', checked as boolean)}
                />
                <Label htmlFor="monthly" className="text-sm font-normal">
                  Monthly reminders
                </Label>
              </div>
            </div>
          </div>

          {/* Daily Alert Time */}
          {schedule.frequencies.includes('daily') && (
            <div className="space-y-2">
              <Label htmlFor="dailyTime">Daily Reminder Time</Label>
              <Input
                id="dailyTime"
                type="time"
                value={schedule.dailyTime}
                onChange={(e) => setSchedule(prev => ({ ...prev, dailyTime: e.target.value }))}
                className="w-full"
              />
            </div>
          )}

          {/* Weekly Schedule */}
          {schedule.frequencies.includes('weekly') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDay">Day of the Week</Label>
                <Select
                  value={schedule.scheduleDay?.toString() || ''}
                  onValueChange={(value) => setSchedule(prev => ({ 
                    ...prev, 
                    scheduleDay: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyTime">Weekly Reminder Time</Label>
                <Input
                  id="weeklyTime"
                  type="time"
                  value={schedule.weeklyTime}
                  onChange={(e) => setSchedule(prev => ({ ...prev, weeklyTime: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Monthly Schedule */}
          {schedule.frequencies.includes('monthly') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate">Day of the Month</Label>
                <Select
                  value={schedule.scheduleDate?.toString() || ''}
                  onValueChange={(value) => setSchedule(prev => ({ 
                    ...prev, 
                    scheduleDate: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthDayOptions.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyTime">Monthly Reminder Time</Label>
                <Input
                  id="monthlyTime"
                  type="time"
                  value={schedule.monthlyTime}
                  onChange={(e) => setSchedule(prev => ({ ...prev, monthlyTime: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Info Text */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p><strong>Note:</strong> Event reminders will be sent according to your selected schedule until the event date passes. You can select multiple frequencies to receive reminders at different intervals.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventReminderSchedulingModal;
