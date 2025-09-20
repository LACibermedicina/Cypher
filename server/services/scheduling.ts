import { IStorage } from "../storage";
import { DoctorSchedule, Appointment } from "@shared/schema";

export interface AvailableSlot {
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  dayOfWeek: number; // 0-6, Sunday to Saturday
  formatted: string; // Human-readable format for AI
}

export class SchedulingService {
  constructor(private storage: IStorage) {}

  /**
   * Get available appointment slots for a doctor within the next 30 days
   */
  async getAvailableSlots(doctorId: string, daysAhead: number = 30): Promise<AvailableSlot[]> {
    try {
      // Get doctor's schedule
      const schedule = await this.storage.getDoctorSchedule(doctorId);
      if (!schedule.length) {
        console.warn(`No schedule found for doctor ${doctorId}`);
        return [];
      }

      // Get existing appointments for the period
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      const existingAppointments = await this.storage.getAppointmentsByDoctor(doctorId);

      const availableSlots: AvailableSlot[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate slots for each day in the range
      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        
        // Skip past dates and get day of week
        if (currentDate < today) continue;
        const dayOfWeek = currentDate.getDay();

        // Find schedule for this day of week
        const daySchedule = schedule.find(s => s.dayOfWeek === dayOfWeek);
        if (!daySchedule) continue;

        // Generate time slots for this day
        const daySlots = this.generateTimeSlotsForDay(
          currentDate,
          daySchedule,
          existingAppointments
        );

        availableSlots.push(...daySlots);
      }

      return availableSlots.slice(0, 20); // Limit to first 20 slots for AI processing
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Generate time slots for a specific day based on doctor schedule
   */
  private generateTimeSlotsForDay(
    date: Date,
    schedule: DoctorSchedule,
    existingAppointments: Appointment[]
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const dateStr = this.formatDate(date);
    
    // Parse start and end times
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    
    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const duration = schedule.consultationDuration || 30; // Default 30 minutes
    
    // Generate slots from start to end time
    const currentSlot = new Date(startTime);
    
    while (currentSlot < endTime) {
      const slotEndTime = new Date(currentSlot);
      slotEndTime.setMinutes(currentSlot.getMinutes() + duration);
      
      // Check if this slot is available (no conflicting appointments)
      if (this.isSlotAvailable(currentSlot, slotEndTime, existingAppointments)) {
        // Skip slots that are in the past (including today if time has passed)
        const now = new Date();
        if (currentSlot > now) {
          slots.push({
            date: dateStr,
            time: this.formatTime(currentSlot),
            dayOfWeek: date.getDay(),
            formatted: this.formatSlotForAI(date, currentSlot)
          });
        }
      }
      
      // Move to next slot
      currentSlot.setMinutes(currentSlot.getMinutes() + duration);
    }
    
    return slots;
  }

  /**
   * Check if a time slot is available (no conflicting appointments)
   */
  private isSlotAvailable(
    slotStart: Date,
    slotEnd: Date,
    existingAppointments: Appointment[]
  ): boolean {
    return !existingAppointments.some(appointment => {
      const appointmentStart = new Date(appointment.scheduledAt);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentStart.getMinutes() + 30); // Assume 30 min default

      // Check for overlap
      return (
        (slotStart < appointmentEnd && slotEnd > appointmentStart) &&
        appointment.status !== 'cancelled'
      );
    });
  }

  /**
   * Create a default schedule for a doctor if none exists
   */
  async createDefaultSchedule(doctorId: string): Promise<void> {
    try {
      const existingSchedule = await this.storage.getDoctorSchedule(doctorId);
      if (existingSchedule.length > 0) {
        return; // Schedule already exists
      }

      // Create default Monday to Friday schedule (8 AM to 5 PM)
      const defaultSchedule = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }, // Monday morning
        { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' }, // Monday afternoon
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' }, // Tuesday morning
        { dayOfWeek: 2, startTime: '14:00', endTime: '17:00' }, // Tuesday afternoon
        { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' }, // Wednesday morning
        { dayOfWeek: 3, startTime: '14:00', endTime: '17:00' }, // Wednesday afternoon
        { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' }, // Thursday morning
        { dayOfWeek: 4, startTime: '14:00', endTime: '17:00' }, // Thursday afternoon
        { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' }, // Friday morning
        { dayOfWeek: 5, startTime: '14:00', endTime: '17:00' }, // Friday afternoon
      ];

      for (const scheduleEntry of defaultSchedule) {
        await this.storage.createDoctorSchedule({
          doctorId,
          dayOfWeek: scheduleEntry.dayOfWeek,
          startTime: scheduleEntry.startTime,
          endTime: scheduleEntry.endTime,
          consultationDuration: 30,
          isActive: true,
        });
      }

      console.log(`Created default schedule for doctor ${doctorId}`);
    } catch (error) {
      console.error('Error creating default schedule:', error);
    }
  }

  /**
   * Check if a specific slot is available for booking
   */
  async isSpecificSlotAvailable(
    doctorId: string,
    date: string,
    time: string
  ): Promise<boolean> {
    try {
      const requestedDateTime = new Date(`${date} ${time}`);
      const endDateTime = new Date(requestedDateTime);
      endDateTime.setMinutes(requestedDateTime.getMinutes() + 30);

      const existingAppointments = await this.storage.getAppointmentsByDoctor(doctorId);
      
      return this.isSlotAvailable(requestedDateTime, endDateTime, existingAppointments);
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  /**
   * Format slot for AI consumption in Portuguese
   */
  private formatSlotForAI(date: Date, time: Date): string {
    const dayNames = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const timeStr = this.formatTime(time);

    return `${dayName}, ${day} de ${month} às ${timeStr}`;
  }
}