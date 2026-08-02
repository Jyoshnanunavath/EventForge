import type { Event, Session, Speaker, Volunteer, SeatingLayout, EventReportData } from '@/lib/supabase';

// ============================================================
// AI Event Planning Assistant
// Rule-based LLM-style assistant that gives contextual
// recommendations based on event data.
// ============================================================

type AssistantContext = {
  event?: Partial<Event>;
  events?: Event[];
  ticketCount?: number;
  speakerCount?: number;
  sessionCount?: number;
  venueCapacity?: number;
};

export function generateAssistantResponse(input: string, ctx: AssistantContext): string {
  const q = input.toLowerCase();
  const { event, events = [], ticketCount = 0, speakerCount = 0, sessionCount = 0, venueCapacity = 0 } = ctx;

  // Timeline / planning
  if (q.match(/timeline|plan|when|schedule.*start|checklist|prepare/)) {
    const daysLeft = event?.start_date ? Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86400000) : null;
    if (daysLeft !== null && daysLeft > 0) {
      if (daysLeft > 30) return `You have ${daysLeft} days until "${event?.title}". Here's my recommended timeline:\n\n• Now–${daysLeft - 21}d: Lock in venue, finalize agenda, open ticket sales\n• ${daysLeft - 21}d–${daysLeft - 14}d: Announce speakers, launch marketing campaign\n• ${daysLeft - 14}d–${daysLeft - 7}d: Send reminders, confirm catering & AV setup\n• ${daysLeft - 7}d–Day 0: Final headcount, seating plan, volunteer briefing\n\nYou're in good shape — focus on speaker announcements and marketing next.`;
      if (daysLeft > 7) return `Only ${daysLeft} days left! Priority actions:\n\n1. Confirm all speakers and send them guidelines\n2. Send attendee reminders with agenda\n3. Finalize catering and AV requirements\n4. Prepare your check-in system and train volunteers\n5. Create your seating arrangement\n\nYou're in the final stretch — execution is key now.`;
      return `Just ${daysLeft} days to go! Critical last-minute checklist:\n\n• Print QR code signs for check-in\n• Confirm volunteer assignments and brief them\n• Test your AV equipment and microphones\n• Prepare name badges and seating labels\n• Have a backup plan for no-shows\n\nYou're ready — focus on smooth execution.`;
    }
    return `Here's a standard event planning timeline:\n\n• 8-12 weeks out: Define goals, budget, lock venue\n• 6-8 weeks: Open ticket sales, announce speakers\n• 4-6 weeks: Marketing push, sponsor outreach\n• 2-4 weeks: Session scheduling, exhibitor coordination\n• 1 week: Reminders, catering, AV check\n• Day before: Volunteer briefing, final headcount\n\nWhat stage are you at?`;
  }

  // Budget / pricing
  if (q.match(/budget|price|cost|revenue|money|ticket price/)) {
    const revenue = ticketCount * (event?.price || 0);
    return `Budget analysis for "${event?.title}":\n\n• Ticket price: ₹${event?.price || 0}\n• Tickets sold: ${ticketCount}\n• Current revenue: ₹${revenue.toFixed(2)}\n• Venue capacity: ${venueCapacity || 'N/A'}\n\nRecommendations:\n1. ${event?.price === 0 ? 'Consider a paid tier for premium access — free events attract no-shows (30-40% typically)' : 'Your pricing looks reasonable. Consider early-bird discounts to boost early sales.'}\n2. Allocate ~40% budget to venue, 20% to catering, 15% to AV, 15% to marketing, 10% contingency\n3. Sponsorship can offset 20-30% of costs — reach out to relevant companies in your sector\n\nWould you like me to help with sponsor outreach templates?`;
  }

  // Marketing
  if (q.match(/market|promot|advert|audience|reach|social/)) {
    return `Marketing strategy for "${event?.title}":\n\n1. **Email campaign** (highest ROI): Send 3-4 emails — announcement, speaker reveal, agenda, last-chance reminder\n2. **Social media**: Create event pages on LinkedIn & X. Post behind-the-scenes content and speaker teasers\n3. **Partnerships**: Ask speakers to promote to their networks — offer them a discount code to share\n4. **Community**: Post in relevant Slack groups, Reddit communities, and industry forums\n5. **Paid ads**: If budget allows, LinkedIn ads targeting your audience's job titles work best for B2B events\n\nWith ${ticketCount} tickets sold${venueCapacity ? ` out of ${venueCapacity} capacity` : ''}, you're at ${venueCapacity ? Math.round((ticketCount / venueCapacity) * 100) : 0}% capacity. ${ticketCount < (venueCapacity || 100) * 0.5 ? 'Consider boosting marketing efforts.' : 'Great traction — maintain momentum!'}`;
  }

  // Speakers
  if (q.match(/speaker|presenter|keynote/)) {
    return `Speaker management insights:\n\n• Current speakers: ${speakerCount}\n• ${speakerCount < 3 ? 'Consider adding more speakers — events with 5+ speakers attract 40% more attendees' : speakerCount < 6 ? 'Good speaker lineup — aim for 1-2 more to add variety' : 'Strong speaker roster! Ensure session diversity across tracks.'}\n\nTips:\n1. Mix keynote speakers with panelists and workshop facilitators\n2. Balance industry veterans with emerging voices\n3. Ensure diversity in gender, background, and perspective\n4. Send speakers a briefing pack: audience profile, time slot, AV specs, and dress code\n5. Collect bios, headshots, and slide decks 1 week before\n\nWould you like help drafting speaker invitation emails?`;
  }

  // Sessions / scheduling
  if (q.match(/session|agenda|schedule|track|program/)) {
    return `Session scheduling recommendations:\n\n• Current sessions: ${sessionCount}\n\nBest practices:\n1. **Morning**: Keynotes and high-energy talks (attendees are freshest)\n2. **Midday**: Breakout sessions and workshops (after lunch, hands-on keeps engagement)\n3. **Afternoon**: Panels and discussions (lower energy, interactive format works)\n4. Keep sessions to 30-45 min with 15 min breaks\n5. Limit to 3-4 parallel tracks max to avoid decision fatigue\n6. Schedule networking breaks every 2 hours\n\n${sessionCount === 0 ? 'Start by adding your first session — I can help with the Automatic Schedule Generator.' : 'Your agenda is taking shape. Use the Automatic Schedule Generator to optimize time slots and avoid conflicts.'}`;
  }

  // Volunteers
  if (q.match(/volunteer|staff|help.*team|crew/)) {
    return `Volunteer planning guide:\n\nFor an event with ${venueCapacity || 100} attendees, I recommend:\n• 2-3 volunteers for registration/check-in\n• 1-2 for session room management\n• 1-2 for VIP/speaker liaison\n• 1 for AV/tech support\n• 2-3 floating volunteers for crowd management\n\nTotal recommended: ${Math.max(5, Math.ceil((venueCapacity || 100) / 50))} volunteers\n\nUse the AI Volunteer Allocation tool to match skills to roles automatically. Volunteers with 'customer service' skills are best for check-in; those with 'technical' skills for AV support.`;
  }

  // Seating
  if (q.match(/seat|layout|arrangement|floor plan|room/)) {
    return `Seating arrangement guidance:\n\nFor ${venueCapacity || 'your'} attendees:\n• **Theater style**: Best for keynotes — max capacity, all facing stage\n• **Banquet rounds**: Best for networking — 8-10 per table\n• **Classroom**: Best for workshops — tables + chairs facing front\n• **U-shape**: Best for small interactive sessions (under 40)\n\nUse the AI Seating Arrangement tool to auto-generate a layout. It will optimize for:\n• Sight lines to stage\n• Aisle placement for easy movement\n• VIP zones near the front\n• Even distribution across the room\n\nWould you like me to generate a layout now?`;
  }

  // Check-in
  if (q.match(/check.?in|entry|gate|registration/)) {
    return `Check-in optimization tips:\n\n1. **Pre-event**: Send attendees their QR codes 24h before. ${ticketCount} tickets = expect ${Math.ceil(ticketCount * 0.85)} to show up\n2. **Peak surge**: 60% of attendees arrive 15-30 min before start. Staff accordingly\n3. **Stations needed**: 1 check-in station per 100 attendees → you need ${Math.max(1, Math.ceil((ticketCount || 100) / 100))} station(s)\n4. **Fast lane**: Have a separate line for VIPs and speakers\n5. **Backup**: Print an attendee list in case QR scanning fails\n\nYour check-in system is ready in the platform — go to the Check-in page on event day.`;
  }

  // Risk / contingency
  if (q.match(/risk|backup|contingency|problem|what if|emergency/)) {
    return `Risk assessment for "${event?.title}":\n\n**High-priority risks:**\n1. Speaker no-show → Have a backup speaker or panel discussion ready\n2. AV failure → Test all equipment 2h before; have spare mics and cables\n3. Wi-Fi overload → Ensure venue has dedicated event bandwidth\n4. Low attendance → Record sessions for post-event content\n\n**Medium-priority:**\n5. Catering delays → Build 15-min buffer in schedule\n6. Check-in bottleneck → Open doors 30 min early, have extra scanners\n7. Weather (outdoor events) → Have an indoor backup plan\n\nCreate a simple "run sheet" with contact numbers for all key people.`;
  }

  // General greeting / help
  if (q.match(/hello|hi|hey|help|what can you/)) {
    return `Hi! I'm your AI Event Planning Assistant. I can help you with:\n\n• **Timeline planning** — "What should I do next?"\n• **Budget & pricing** — "Is my ticket price right?"\n• **Marketing** — "How do I promote my event?"\n• **Speakers** — "How many speakers do I need?"\n• **Sessions** — "Help me plan the agenda"\n• **Volunteers** — "How many volunteers do I need?"\n• **Seating** — "What seating layout works best?"\n• **Check-in** — "How do I optimize entry?"\n• **Risk planning** — "What could go wrong?"\n\n${event ? `I see you're working on "${event.title}". Ask me anything!` : 'Ask me anything about event planning!'}`;
  }

  // Default — try to give a helpful contextual response
  return `That's a great question. Based on your event "${event?.title || 'your event'}":\n\n• You have ${ticketCount} tickets sold, ${speakerCount} speakers, and ${sessionCount} sessions scheduled.\n${venueCapacity ? `• Venue capacity is ${venueCapacity} — you're at ${Math.round((ticketCount / venueCapacity) * 100)}% capacity.\n` : ''}\nI can help with timeline planning, budget analysis, marketing strategy, speaker management, session scheduling, volunteer allocation, seating arrangements, check-in optimization, and risk planning.\n\nTry asking me something like "What should I prioritize?" or "How's my event doing?"`;
}

// ============================================================
// Automatic Schedule Generator
// Distributes sessions across tracks and time slots,
// avoiding speaker conflicts and balancing the agenda.
// ============================================================

export type GeneratedSlot = {
  session_id: string;
  title: string;
  track: string;
  start_time: string;
  end_time: string;
  room: string;
  speaker_name: string;
  conflict: boolean;
};

export type ScheduleResult = {
  slots: GeneratedSlot[];
  conflicts: string[];
  tracks: string[];
  startTime: string;
  endTime: string;
};

export function generateSchedule(params: {
  event: Pick<Event, 'start_date' | 'end_date'>;
  sessions: Session[];
  speakers: Speaker[];
  numTracks?: number;
  sessionDuration?: number;
  breakDuration?: number;
}): ScheduleResult {
  const { event, sessions, speakers } = params;
  const numTracks = params.numTracks || 3;
  const sessionDuration = params.sessionDuration || 45;
  const breakDuration = params.breakDuration || 15;

  const tracks = Array.from({ length: numTracks }, (_, i) => `Track ${String.fromCharCode(65 + i)}`);
  const rooms = Array.from({ length: numTracks }, (_, i) => `Room ${String.fromCharCode(65 + i)}`);

  const eventStart = new Date(event.start_date);
  eventStart.setHours(9, 0, 0, 0); // Start at 9 AM

  const slots: GeneratedSlot[] = [];
  const conflicts: string[] = [];
  const speakerSchedule: Record<string, string[]> = {}; // speaker_id -> booked times

  // Sort sessions: keynotes first, then by capacity (popularity)
  const sorted = [...sessions].sort((a, b) => {
    if (a.track === 'Main' && b.track !== 'Main') return -1;
    if (b.track === 'Main' && a.track !== 'Main') return 1;
    return b.capacity - a.capacity;
  });

  let currentTime = new Date(eventStart);
  let trackIndex = 0;
  let sessionInBlock = 0;
  const sessionsPerBlock = numTracks; // Fill all tracks before advancing time

  for (const session of sorted) {
    const speaker = session.speaker_id ? speakers.find((s) => s.id === session.speaker_id) : null;
    const speakerName = speaker?.name || 'TBA';
    const timeKey = currentTime.toISOString();

    // Check for speaker conflict
    let hasConflict = false;
    if (session.speaker_id) {
      const booked = speakerSchedule[session.speaker_id] || [];
      if (booked.includes(timeKey)) {
        hasConflict = true;
        conflicts.push(`${speakerName} is double-booked at ${currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } else {
        booked.push(timeKey);
        speakerSchedule[session.speaker_id] = booked;
      }
    }

    const endTime = new Date(currentTime.getTime() + sessionDuration * 60000);

    slots.push({
      session_id: session.id,
      title: session.title,
      track: tracks[trackIndex],
      start_time: currentTime.toISOString(),
      end_time: endTime.toISOString(),
      room: rooms[trackIndex],
      speaker_name: speakerName,
      conflict: hasConflict,
    });

    trackIndex++;
    sessionInBlock++;

    if (sessionInBlock >= sessionsPerBlock) {
      // Move to next time slot with a break
      currentTime = new Date(endTime.getTime() + breakDuration * 60000);
      trackIndex = 0;
      sessionInBlock = 0;

      // Lunch break at 12:30
      if (currentTime.getHours() === 12 && currentTime.getMinutes() >= 30) {
        currentTime.setHours(13, 30, 0, 0);
      }
      // End day at 5 PM
      if (currentTime.getHours() >= 17) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(9, 0, 0, 0);
      }
    }
  }

  const lastEnd = slots.length > 0 ? slots[slots.length - 1].end_time : eventStart.toISOString();

  return { slots, conflicts, tracks, startTime: eventStart.toISOString(), endTime: lastEnd };
}

// ============================================================
// AI Volunteer Allocation
// Matches volunteers to roles based on skills, experience,
// and availability using a weighted scoring algorithm.
// ============================================================

export type VolunteerRole = {
  role: string;
  task: string;
  zone: string;
  requiredSkills: string[];
  priority: 'high' | 'medium' | 'low';
};

export const volunteerRoles: VolunteerRole[] = [
  { role: 'Registration Lead', task: 'Manage check-in desks and ticket scanning', zone: 'Entrance', requiredSkills: ['customer service', 'organization', 'communication'], priority: 'high' },
  { role: 'Check-in Volunteer', task: 'Scan QR codes and distribute badges', zone: 'Entrance', requiredSkills: ['customer service', 'communication'], priority: 'high' },
  { role: 'Session Coordinator', task: 'Manage session rooms and timing', zone: 'Session Rooms', requiredSkills: ['organization', 'time management'], priority: 'high' },
  { role: 'Speaker Liaison', task: 'Escort and assist speakers', zone: 'Backstage', requiredSkills: ['communication', 'hospitality'], priority: 'medium' },
  { role: 'AV Technician', task: 'Handle microphones, projectors, and streaming', zone: 'Tech Booth', requiredSkills: ['technical', 'audio visual', 'it'], priority: 'high' },
  { role: 'VIP Host', task: 'Welcome and guide VIP guests', zone: 'VIP Lounge', requiredSkills: ['hospitality', 'communication', 'customer service'], priority: 'medium' },
  { role: 'Crowd Manager', task: 'Guide attendees and manage flow', zone: 'Floor', requiredSkills: ['communication', 'crowd management'], priority: 'medium' },
  { role: 'Info Desk', task: 'Answer attendee questions and provide directions', zone: 'Atrium', requiredSkills: ['communication', 'knowledge'], priority: 'low' },
  { role: 'Catering Assistant', task: 'Coordinate food service and refreshments', zone: 'Catering Area', requiredSkills: ['hospitality', 'organization'], priority: 'low' },
  { role: 'Floater', task: 'Provide support wherever needed', zone: 'All Areas', requiredSkills: ['flexible'], priority: 'low' },
];

export function allocateVolunteers(volunteers: Volunteer[]): Volunteer[] {
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const experienceWeight = { expert: 3, intermediate: 2, beginner: 1 };
  const availabilityWeight = { full: 3, partial: 2, limited: 1 };

  const assignedRoles = new Set<string>();
  const zoneCounts: Record<string, number> = {};

  return volunteers.map((v) => {
    // Score each role for this volunteer
    const scores = volunteerRoles.map((role) => {
      // Skip if role already taken (limit 2 per role for larger events)
      if (assignedRoles.has(role.role) && zoneCounts[role.role] >= 2) {
        return { role, score: -1 };
      }

      let score = 0;

      // Skill matching (highest weight)
      const skillMatches = role.requiredSkills.filter((s) =>
        v.skills.some((vs) => vs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(vs.toLowerCase())),
      );
      score += skillMatches.length * 10;

      // Preferred role match
      if (v.preferred_role && v.preferred_role.toLowerCase().includes(role.role.toLowerCase().split(' ')[0])) {
        score += 15;
      }

      // Experience weighting
      score += (experienceWeight[v.experience as keyof typeof experienceWeight] || 1) * 3;

      // Availability weighting
      score += (availabilityWeight[v.availability as keyof typeof availabilityWeight] || 1) * 2;

      // Priority weighting — assign high-priority roles first to experienced volunteers
      score += priorityWeight[role.priority] * 2;

      // If no skills match at all, lower the score significantly
      if (skillMatches.length === 0 && !v.preferred_role) {
        score -= 5;
      }

      return { role, score };
    });

    // Pick the best role
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    if (best && best.score > 0) {
      assignedRoles.add(best.role.role);
      zoneCounts[best.role.role] = (zoneCounts[best.role.role] || 0) + 1;
      return {
        ...v,
        assigned_role: best.role.role,
        assigned_task: best.role.task,
        assigned_zone: best.role.zone,
        status: 'assigned' as const,
      };
    }

    // Fallback — assign as floater
    return {
      ...v,
      assigned_role: 'Floater',
      assigned_task: 'Provide support wherever needed',
      assigned_zone: 'All Areas',
      status: 'assigned' as const,
    };
  });
}

// ============================================================
// AI Seating Arrangement Generator
// Generates an optimized seating layout based on capacity,
// style, and VIP requirements.
// ============================================================

export type SeatingConfig = {
  capacity: number;
  style: 'theater' | 'banquet' | 'classroom' | 'ushape';
  vipPercentage: number;
  hasStage: boolean;
  stagePosition: 'top' | 'bottom' | 'left' | 'right';
  aisleEvery: number;
};

export function generateSeatingLayout(config: SeatingConfig): SeatingLayout {
  const { capacity, style, vipPercentage, hasStage, stagePosition, aisleEvery } = config;

  const rows: SeatingLayout['rows'] = [];
  const vipZones: SeatingLayout['vipZones'] = [];
  const aisles: number[] = [];

  if (style === 'theater') {
    const seatsPerRow = Math.min(20, Math.ceil(Math.sqrt(capacity * 2)));
    const numRows = Math.ceil(capacity / seatsPerRow);
    const vipRows = Math.max(1, Math.ceil(numRows * (vipPercentage / 100)));

    let remaining = capacity;
    for (let r = 0; r < numRows; r++) {
      const seats = Math.min(seatsPerRow, remaining);
      remaining -= seats;
      const isVip = r < vipRows;
      rows.push({
        id: `R${r + 1}`,
        seats,
        label: `Row ${r + 1}`,
        zone: isVip ? 'VIP' : 'General',
      });
      if (isVip && r === 0) {
        vipZones.push({ id: 'VIP1', label: 'VIP Front', rows: [`R1`, `R${vipRows}`] });
      }
    }

    // Aisles every N rows
    for (let i = aisleEvery; i < numRows; i += aisleEvery) {
      aisles.push(i);
    }
  } else if (style === 'banquet') {
    const seatsPerTable = 8;
    const numTables = Math.ceil(capacity / seatsPerTable);
    const tablesPerRow = Math.min(5, Math.ceil(Math.sqrt(numTables)));
    const numRows = Math.ceil(numTables / tablesPerRow);
    const vipTables = Math.ceil(numTables * (vipPercentage / 100));

    let tableCount = 0;
    for (let r = 0; r < numRows; r++) {
      const tablesInRow = Math.min(tablesPerRow, numTables - tableCount);
      rows.push({
        id: `T-Row${r + 1}`,
        seats: tablesInRow * seatsPerTable,
        label: `Table Row ${r + 1}`,
        zone: r === 0 && vipTables > 0 ? 'VIP' : 'General',
      });
      tableCount += tablesInRow;
    }
    if (vipTables > 0) {
      vipZones.push({ id: 'VIP1', label: 'VIP Tables', rows: ['T-Row1'] });
    }
  } else if (style === 'classroom') {
    const seatsPerRow = Math.min(12, Math.ceil(capacity / 8));
    const numRows = Math.ceil(capacity / seatsPerRow);
    const vipRows = Math.max(1, Math.ceil(numRows * (vipPercentage / 100)));
    let remaining = capacity;
    for (let r = 0; r < numRows; r++) {
      const seats = Math.min(seatsPerRow, remaining);
      remaining -= seats;
      rows.push({
        id: `R${r + 1}`,
        seats,
        label: `Row ${r + 1}`,
        zone: r < vipRows ? 'VIP' : 'General',
      });
    }
    if (vipRows > 0) {
      vipZones.push({ id: 'VIP1', label: 'VIP Front', rows: ['R1'] });
    }
  } else {
    // U-shape
    const seatsPerSide = Math.ceil(capacity / 3);
    rows.push({ id: 'LEFT', seats: seatsPerSide, label: 'Left Side', zone: 'General' });
    rows.push({ id: 'HEAD', seats: Math.ceil(capacity * 0.2), label: 'Head Table', zone: 'VIP' });
    rows.push({ id: 'RIGHT', seats: seatsPerSide, label: 'Right Side', zone: 'General' });
    vipZones.push({ id: 'VIP1', label: 'Head Table', rows: ['HEAD'] });
  }

  const totalSeats = rows.reduce((sum: number, r: { seats: number }) => sum + r.seats, 0);

  return {
    rows,
    stage: { position: stagePosition, width: 60 },
    vipZones,
    aisles,
    totalSeats,
  };
}

// ============================================================
// Crowd Prediction
// Predicts expected attendance, peak arrival times, and
// crowd density throughout the event based on ticket sales,
// historical no-show rates, and event timing.

// ============================================================
// Crowd Prediction
// Predicts expected attendance, peak arrival times, and
// crowd density throughout the event based on ticket sales,
// historical no-show rates, and event timing.
// ============================================================

export type CrowdPrediction = {
  expectedAttendance: number;
  noShowRate: number;
  peakArrivalTime: string;
  peakArrivalCount: number;
  crowdDensity: { time: string; label: string; density: number; count: number }[];
  recommendations: string[];
  confidenceLevel: number;
};

export function predictCrowd(params: {
  ticketsSold: number;
  maxCapacity: number;
  eventStart: string;
  eventEnd: string;
  isFreeEvent: boolean;
  hasFood: boolean;
}): CrowdPrediction {
  const { ticketsSold, maxCapacity, eventStart, isFreeEvent, hasFood } = params;
  const baseNoShow = isFreeEvent ? 0.40 : 0.18;
  const noShowRate = Math.min(0.50, baseNoShow + (ticketsSold < maxCapacity * 0.3 ? 0.05 : 0));
  const expectedAttendance = Math.round(ticketsSold * (1 - noShowRate));
  const start = new Date(eventStart);
  const peakArrivalTime = new Date(start.getTime() - 15 * 60000);
  const peakArrivalCount = Math.round(expectedAttendance * 0.6);

  const crowdDensity: CrowdPrediction['crowdDensity'] = [];
  const timeline = [
    { offset: -60, label: '1h before' },
    { offset: -30, label: '30m before' },
    { offset: -15, label: '15m before' },
    { offset: 0, label: 'Start' },
    { offset: 15, label: '15m in' },
    { offset: 60, label: '1h in' },
    { offset: 120, label: '2h in' },
    { offset: 180, label: '3h in' },
    { offset: 240, label: '4h in' },
  ];

  for (const t of timeline) {
    const time = new Date(start.getTime() + t.offset * 60000);
    let percentage = 0;
    if (t.offset < 0) {
      percentage = t.offset >= -15 ? 0.60 : t.offset >= -30 ? 0.25 : t.offset >= -60 ? 0.10 : 0.05;
    } else {
      if (hasFood && t.offset <= 120) percentage = 0.95;
      else if (t.offset <= 60) percentage = 0.90;
      else if (t.offset <= 120) percentage = 0.80;
      else if (t.offset <= 180) percentage = 0.65;
      else percentage = 0.50;
    }
    const count = Math.round(expectedAttendance * percentage);
    crowdDensity.push({ time: time.toISOString(), label: t.label, density: count / maxCapacity, count });
  }

  const recommendations: string[] = [];
  if (expectedAttendance > maxCapacity * 0.8) {
    recommendations.push('High expected turnout — consider opening doors 30 minutes early to manage the crowd surge.');
  }
  recommendations.push('Staff ' + Math.max(2, Math.ceil(peakArrivalCount / 50)) + ' check-in stations during peak arrival (15 min before start).');
  if (noShowRate > 0.30) {
    recommendations.push('High no-show rate expected (' + Math.round(noShowRate * 100) + '%). Consider overbooking by ' + Math.round(ticketsSold * noShowRate * 0.5) + ' seats or sending reminder emails 24h before.');
  }
  if (hasFood) {
    recommendations.push('Food service will retain attendees through the mid-event period — plan catering for 95% of expected attendance.');
  }
  recommendations.push('Peak crowd density: ' + Math.round((peakArrivalCount / maxCapacity) * 100) + '% of venue capacity at ' + peakArrivalTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.');

  const confidenceLevel = ticketsSold > 20 ? 85 : ticketsSold > 5 ? 65 : 40;

  return { expectedAttendance, noShowRate, peakArrivalTime: peakArrivalTime.toISOString(), peakArrivalCount, crowdDensity, recommendations, confidenceLevel };
}

// ============================================================
// Sentiment Analysis
// Analyzes feedback text using a lexicon-based approach to
// compute sentiment scores and extract key themes.
// ============================================================

const positiveWords = [
  'amazing', 'excellent', 'great', 'fantastic', 'wonderful', 'awesome', 'good',
  'loved', 'love', 'perfect', 'outstanding', 'brilliant', 'superb', 'helpful',
  'informative', 'engaging', 'inspiring', 'professional', 'smooth', 'seamless',
  'well-organized', 'impressive', 'delightful', 'enjoyable', 'valuable', 'useful',
  'recommend', 'best', 'top', 'happy', 'satisfied', 'pleased', 'enjoyed', 'beautiful',
  'friendly', 'comfortable', 'clean', 'spacious', 'modern', 'innovative', 'exciting',
  'thoughtful', 'responsive', 'efficient', 'organized', 'clear', 'relevant',
];

const negativeWords = [
  'terrible', 'awful', 'bad', 'horrible', 'worst', 'poor', 'disappointing',
  'disappointed', 'boring', 'confusing', 'disorganized', 'chaotic', 'crowded',
  'uncomfortable', 'dirty', 'slow', 'late', 'unprofessional', 'rude', 'unclear',
  'useless', 'waste', 'overpriced', 'expensive', 'noisy', 'cramped', 'stuffy',
  'broken', 'malfunction', 'cancelled', 'delayed', 'missing', 'lost', 'cold',
  'unhelpful', 'frustrating', 'frustrated', 'annoying', 'difficult', 'hard to',
  'not good', 'not worth', 'would not', 'never again', 'regret',
];

const intensifiers = ['very', 'really', 'extremely', 'incredibly', 'so', 'super', 'absolutely'];
const negators = ['not', 'no', 'never', "don't", "didn't", "wasn't", "isn't", "aren't", "won't"];

export function analyzeSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return { score: 0, label: 'neutral' };

  let score = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const prevPrevWord = i > 1 ? words[i - 2] : '';
    let weight = 1;
    if (intensifiers.includes(prevWord)) weight = 2;
    const isNegated = negators.includes(prevWord) || negators.includes(prevPrevWord);
    if (positiveWords.some((p) => word.includes(p) || p.includes(word))) {
      score += isNegated ? -weight : weight;
    }
    if (negativeWords.some((n) => word.includes(n) || n.includes(word))) {
      score += isNegated ? weight : -weight;
    }
  }

  const normalized = Math.max(-1, Math.min(1, score / Math.max(3, words.length / 5)));
  const label: 'positive' | 'neutral' | 'negative' = normalized > 0.1 ? 'positive' : normalized < -0.1 ? 'negative' : 'neutral';
  return { score: normalized, label };
}

export type SentimentSummary = {
  averageScore: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  averageRating: number;
  topThemes: { theme: string; sentiment: number; count: number }[];
  categoryBreakdown: { category: string; avgScore: number; count: number }[];
};

export function summarizeSentiment(feedback: { comment: string; sentiment_score: number; sentiment_label: string; rating: number; category: string }[]): SentimentSummary {
  if (feedback.length === 0) {
    return { averageScore: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0, averageRating: 0, topThemes: [], categoryBreakdown: [] };
  }

  const averageScore = feedback.reduce((s, f) => s + f.sentiment_score, 0) / feedback.length;
  const positiveCount = feedback.filter((f) => f.sentiment_label === 'positive').length;
  const neutralCount = feedback.filter((f) => f.sentiment_label === 'neutral').length;
  const negativeCount = feedback.filter((f) => f.sentiment_label === 'negative').length;
  const averageRating = feedback.reduce((s, f) => s + f.rating, 0) / feedback.length;

  const categories = ['general', 'content', 'venue', 'speakers', 'organization', 'food', 'other'];
  const categoryBreakdown = categories.map((cat) => {
    const items = feedback.filter((f) => f.category === cat);
    return { category: cat, avgScore: items.length > 0 ? items.reduce((s, f) => s + f.sentiment_score, 0) / items.length : 0, count: items.length };
  }).filter((c) => c.count > 0);

  const wordFreq: Record<string, { count: number; sentiment: number }> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'was', 'is', 'are', 'to', 'in', 'on', 'at', 'for', 'of', 'it', 'this', 'that', 'with', 'from', 'as', 'by', 'event', 'i', 'my', 'we', 'our', 'they', 'their', 'had', 'have', 'has', 'been', 'were', 'be', 'so', 'very', 'really', 'just', 'also', 'too', 'can', 'could', 'would', 'should', 'will', 'all', 'some', 'more', 'most', 'much', 'many', 'good', 'great']);
  for (const f of feedback) {
    const words = f.comment.toLowerCase().match(/\b\w+\b/g) || [];
    for (const w of words) {
      if (w.length < 4 || stopWords.has(w)) continue;
      if (!wordFreq[w]) wordFreq[w] = { count: 0, sentiment: 0 };
      wordFreq[w].count++;
      wordFreq[w].sentiment += f.sentiment_score;
    }
  }
  const topThemes = Object.entries(wordFreq)
    .filter(([, v]) => v.count >= 2)
    .map(([theme, v]) => ({ theme, sentiment: v.sentiment / v.count, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { averageScore, positiveCount, neutralCount, negativeCount, averageRating, topThemes, categoryBreakdown };
}

// ============================================================
// AI Event Report Generator
// Generates a structured post-event report with metrics,
// insights, and recommendations.
// ============================================================

export function generateEventReport(params: {
  event: Pick<Event, 'title' | 'description' | 'category' | 'start_date' | 'end_date' | 'max_attendees' | 'price' | 'currency' | 'status'>;
  ticketsSold: number;
  totalRevenue: number;
  checkedIn: number;
  speakerCount: number;
  sessionCount: number;
  sponsorCount: number;
  exhibitorCount: number;
  volunteerCount: number;
  feedbackSummary?: SentimentSummary;
}): EventReportData {
  const { event, ticketsSold, totalRevenue, checkedIn, speakerCount, sessionCount, sponsorCount, exhibitorCount, volunteerCount, feedbackSummary } = params;
  const cur = event.currency === 'INR' ? '₹' : event.currency === 'USD' ? '$' : '';
  const attendanceRate = ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0;
  const capacityUtilization = event.max_attendees > 0 ? Math.round((ticketsSold / event.max_attendees) * 100) : 0;
  const avgRevenuePerAttendee = checkedIn > 0 ? totalRevenue / checkedIn : 0;

  const metrics = [
    { label: 'Tickets Sold', value: String(ticketsSold) },
    { label: 'Revenue', value: cur + totalRevenue.toFixed(2) },
    { label: 'Attendance Rate', value: attendanceRate + '%' },
    { label: 'Capacity Utilization', value: capacityUtilization + '%' },
    { label: 'Checked In', value: String(checkedIn) },
    { label: 'Speakers', value: String(speakerCount) },
    { label: 'Sessions', value: String(sessionCount) },
    { label: 'Sponsors', value: String(sponsorCount) },
    { label: 'Avg Revenue / Attendee', value: cur + avgRevenuePerAttendee.toFixed(2) },
  ];

  const insights: string[] = [];
  if (capacityUtilization > 80) insights.push('Excellent capacity utilization at ' + capacityUtilization + '% — the event venue was well-utilized.');
  else if (capacityUtilization < 40) insights.push('Low capacity utilization at ' + capacityUtilization + '% — consider a smaller venue or increased marketing for future events.');
  if (attendanceRate > 85) insights.push('Strong attendance rate of ' + attendanceRate + '% — attendees were highly engaged and showed up.');
  else if (attendanceRate < 60) insights.push('Attendance rate of ' + attendanceRate + '% suggests room for improvement in pre-event communication and reminders.');
  if (speakerCount >= 5) insights.push('Strong speaker lineup with ' + speakerCount + ' speakers provided diverse perspectives.');
  if (sponsorCount > 0) insights.push(sponsorCount + ' sponsors contributed to event revenue and credibility.');
  if (feedbackSummary && feedbackSummary.averageRating > 0) {
    insights.push('Average attendee rating: ' + feedbackSummary.averageRating.toFixed(1) + '/5 with ' + feedbackSummary.positiveCount + ' positive reviews.');
  }

  const recommendations: string[] = [];
  if (attendanceRate < 70) recommendations.push('Send reminder emails 48h and 24h before the event to reduce no-shows.');
  if (capacityUtilization < 50) recommendations.push('Invest in targeted marketing campaigns and early-bird pricing to boost ticket sales.');
  if (feedbackSummary && feedbackSummary.negativeCount > feedbackSummary.positiveCount * 0.3) {
    recommendations.push('Address negative feedback themes — review the top negative keywords and improve those areas for the next event.');
  }
  recommendations.push('For the next event, aim for ' + Math.round(event.max_attendees * 0.85) + '+ ticket sales to maximize venue ROI.');
  if (speakerCount < 3) recommendations.push('Expand the speaker roster — events with 5+ speakers see 40% higher attendance.');
  recommendations.push('Collect feedback within 24h of the event while memories are fresh for higher response rates.');

  const highlights: string[] = [];
  if (ticketsSold > 0) highlights.push(ticketsSold + ' tickets sold');
  if (totalRevenue > 0) highlights.push(cur + totalRevenue.toFixed(0) + ' in revenue');
  if (checkedIn > 0) highlights.push(checkedIn + ' attendees checked in');
  if (speakerCount > 0) highlights.push(speakerCount + ' speakers featured');
  if (sessionCount > 0) highlights.push(sessionCount + ' sessions delivered');
  if (sponsorCount > 0) highlights.push(sponsorCount + ' sponsors partnered');

  const summary = '"' + event.title + '" was a ' + event.status + ' event in the ' + event.category + ' category' + (event.max_attendees ? ' with a capacity of ' + event.max_attendees : '') + '. The event sold ' + ticketsSold + ' tickets' + (totalRevenue > 0 ? ' generating ' + cur + totalRevenue.toFixed(2) + ' in revenue' : '') + ', with ' + checkedIn + ' attendees checking in (' + attendanceRate + '% attendance rate). The event featured ' + speakerCount + ' speakers across ' + sessionCount + ' sessions' + (sponsorCount > 0 ? ', supported by ' + sponsorCount + ' sponsors' : '') + (exhibitorCount > 0 ? ' and ' + exhibitorCount + ' exhibitors' : '') + '. ' + (volunteerCount > 0 ? volunteerCount + ' volunteers helped ensure smooth operations.' : '');

  const fullReport = '# Event Report: ' + event.title + '\n\n## Executive Summary\n' + summary + '\n\n## Key Metrics\n' + metrics.map((m) => '• ' + m.label + ': ' + m.value).join('\n') + '\n\n## Insights\n' + insights.map((i) => '• ' + i).join('\n') + '\n\n## Highlights\n' + highlights.map((h) => '• ' + h).join('\n') + '\n\n## Recommendations\n' + recommendations.map((r) => '• ' + r).join('\n') + (feedbackSummary && feedbackSummary.topThemes.length > 0 ? '\n\n## Feedback Themes\n' + feedbackSummary.topThemes.map((t) => '• ' + t.theme + ' (' + t.count + ' mentions, sentiment: ' + (t.sentiment > 0.1 ? 'positive' : t.sentiment < -0.1 ? 'negative' : 'neutral') + ')').join('\n') : '');

  return { summary, metrics, insights, recommendations, highlights, fullReport };
}

// ============================================================
// Budget Prediction
// Predicts total event costs and break-even point based on
// venue, catering, AV, marketing, and staffing costs.
// ============================================================

export type BudgetPrediction = {
  totalEstimatedCost: number;
  costBreakdown: { category: string; amount: number; percentage: number }[];
  projectedRevenue: number;
  projectedProfit: number;
  breakEvenTickets: number;
  breakEvenPrice: number;
  recommendations: string[];
  costPerAttendee: number;
};

export function predictBudget(params: {
  maxAttendees: number;
  ticketPrice: number;
  ticketsSold: number;
  venueCost: number;
  cateringCost: number;
  avCost: number;
  marketingCost: number;
  staffingCost: number;
  miscCost: number;
}): BudgetPrediction {
  const { maxAttendees, ticketPrice, ticketsSold, venueCost, cateringCost, avCost, marketingCost, staffingCost, miscCost } = params;
  const expectedAttendance = Math.round(ticketsSold * 0.85);
  const scaledCatering = cateringCost > 0 ? Math.round(cateringCost * (expectedAttendance / maxAttendees)) : 0;
  const totalEstimatedCost = venueCost + scaledCatering + avCost + marketingCost + staffingCost + miscCost;

  const costBreakdown = [
    { category: 'Venue', amount: venueCost, percentage: venueCost / Math.max(totalEstimatedCost, 1) * 100 },
    { category: 'Catering', amount: scaledCatering, percentage: scaledCatering / Math.max(totalEstimatedCost, 1) * 100 },
    { category: 'AV & Tech', amount: avCost, percentage: avCost / Math.max(totalEstimatedCost, 1) * 100 },
    { category: 'Marketing', amount: marketingCost, percentage: marketingCost / Math.max(totalEstimatedCost, 1) * 100 },
    { category: 'Staffing', amount: staffingCost, percentage: staffingCost / Math.max(totalEstimatedCost, 1) * 100 },
    { category: 'Miscellaneous', amount: miscCost, percentage: miscCost / Math.max(totalEstimatedCost, 1) * 100 },
  ].sort((a, b) => b.amount - a.amount);

  const projectedRevenue = ticketsSold * ticketPrice;
  const projectedProfit = projectedRevenue - totalEstimatedCost;
  const breakEvenTickets = ticketPrice > 0 ? Math.ceil(totalEstimatedCost / ticketPrice) : 0;
  const breakEvenPrice = expectedAttendance > 0 ? totalEstimatedCost / expectedAttendance : 0;
  const costPerAttendee = expectedAttendance > 0 ? totalEstimatedCost / expectedAttendance : 0;

  const recommendations: string[] = [];
  if (projectedProfit < 0) {
    recommendations.push('You are projected to lose ₹' + Math.abs(projectedProfit).toFixed(2) + '. Consider increasing ticket price to ₹' + Math.ceil(breakEvenPrice) + ' or selling ' + breakEvenTickets + ' tickets to break even.');
  } else {
    recommendations.push('You are projected to profit ₹' + projectedProfit.toFixed(2) + '. Your break-even point is ' + breakEvenTickets + ' tickets at ₹' + ticketPrice + ' each.');
  }
  if (venueCost / totalEstimatedCost > 0.5) {
    recommendations.push('Venue costs are over 50% of your budget — consider negotiating or finding a more cost-effective space.');
  }
  if (marketingCost < totalEstimatedCost * 0.10) {
    recommendations.push('Marketing budget is below 10% — invest more in promotion to boost ticket sales.');
  }
  if (ticketPrice === 0) {
    recommendations.push('Free events rely on sponsorship or other revenue. Ensure you have sponsors or a monetization strategy.');
  }
  recommendations.push('Cost per attendee: ₹' + costPerAttendee.toFixed(2) + '. Target keeping this below your ticket price for profitability.');

  return { totalEstimatedCost, costBreakdown, projectedRevenue, projectedProfit, breakEvenTickets, breakEvenPrice, recommendations, costPerAttendee };
}

// ============================================================
// Risk Detection Dashboard
// Detects potential risks across an event and scores them
// by severity and likelihood.
// ============================================================

export type RiskItem = {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: number;
  impact: number;
  riskScore: number;
  mitigation: string;
  status: 'open' | 'mitigated';
};

export function detectRisks(params: {
  event: Pick<Event, 'title' | 'start_date' | 'end_date' | 'max_attendees' | 'price' | 'status' | 'venue_id'>;
  ticketsSold: number;
  speakersConfirmed: number;
  sessionsScheduled: number;
  hasVenue: boolean;
  daysUntilEvent: number;
  volunteersAssigned: number;
  sponsorCount: number;
}): RiskItem[] {
  const risks: RiskItem[] = [];
  const { event, ticketsSold, speakersConfirmed, sessionsScheduled, hasVenue, daysUntilEvent, volunteersAssigned, sponsorCount } = params;

  if (!hasVenue) {
    risks.push({ id: 'no-venue', category: 'Logistics', description: 'No venue has been assigned to this event.', severity: 'critical', likelihood: 100, impact: 95, riskScore: 95, mitigation: 'Secure a venue immediately — without one, the event cannot proceed. Contact venues that match your capacity needs.', status: 'open' });
  }

  const capacityPct = event.max_attendees > 0 ? (ticketsSold / event.max_attendees) * 100 : 0;
  if (daysUntilEvent < 14 && capacityPct < 40) {
    risks.push({ id: 'low-sales', category: 'Revenue', description: 'Only ' + ticketsSold + ' tickets sold (' + Math.round(capacityPct) + '% capacity) with ' + daysUntilEvent + ' days remaining.', severity: daysUntilEvent < 7 ? 'critical' : 'high', likelihood: 80, impact: 70, riskScore: daysUntilEvent < 7 ? 85 : 72, mitigation: 'Launch a last-minute marketing push: email campaigns, social media ads, and speaker promotions. Consider early-bird or group discounts.', status: 'open' });
  }

  if (speakersConfirmed === 0 && daysUntilEvent < 30) {
    risks.push({ id: 'no-speakers', category: 'Content', description: 'No speakers have been confirmed for this event.', severity: daysUntilEvent < 14 ? 'critical' : 'high', likelihood: 90, impact: 80, riskScore: daysUntilEvent < 14 ? 85 : 75, mitigation: 'Reach out to industry leaders, use your network, or consider panel discussions which require less lead time.', status: 'open' });
  }

  if (sessionsScheduled === 0 && daysUntilEvent < 21) {
    risks.push({ id: 'no-sessions', category: 'Content', description: 'No sessions have been scheduled.', severity: 'high', likelihood: 85, impact: 75, riskScore: 75, mitigation: 'Use the Automatic Schedule Generator to create a session timeline. Even a draft agenda helps with marketing.', status: 'open' });
  }

  const neededVolunteers = Math.max(5, Math.ceil(event.max_attendees / 50));
  if (volunteersAssigned < neededVolunteers && daysUntilEvent < 14) {
    risks.push({ id: 'volunteer-shortage', category: 'Operations', description: 'Only ' + volunteersAssigned + ' volunteers assigned — ' + neededVolunteers + ' recommended for ' + event.max_attendees + ' attendees.', severity: 'medium', likelihood: 70, impact: 55, riskScore: 55, mitigation: 'Recruit more volunteers through social media, university partnerships, or community groups. Use AI Volunteer Allocation to optimize assignments.', status: 'open' });
  }

  if (event.status === 'draft' && daysUntilEvent < 21) {
    risks.push({ id: 'still-draft', category: 'Operations', description: 'Event is still in draft status with less than 3 weeks to go.', severity: 'high', likelihood: 100, impact: 60, riskScore: 70, mitigation: 'Publish the event immediately to allow ticket sales and marketing. A draft event cannot be found by attendees.', status: 'open' });
  }

  if (sponsorCount === 0 && event.price === 0 && daysUntilEvent < 30) {
    risks.push({ id: 'no-sponsors-free', category: 'Financial', description: 'Free event with no sponsors — no revenue source identified.', severity: 'high', likelihood: 80, impact: 70, riskScore: 70, mitigation: 'Reach out to companies in your event category for sponsorship. Even small sponsorships offset costs. Alternatively, add a paid ticket tier.', status: 'open' });
  }

  if (daysUntilEvent < 0) {
    risks.push({ id: 'past-event', category: 'Timeline', description: 'Event start date has passed.', severity: 'critical', likelihood: 100, impact: 100, riskScore: 100, mitigation: 'Update the event status to completed or reschedule if needed.', status: 'open' });
  }

  const eventDuration = (new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 3600000;
  if (eventDuration < 1 && eventDuration > 0) {
    risks.push({ id: 'short-event', category: 'Content', description: 'Event duration is only ' + Math.round(eventDuration * 60) + ' minutes — may not provide enough value.', severity: 'low', likelihood: 60, impact: 40, riskScore: 35, mitigation: 'Consider extending the event or adding networking time. Short events work for focused sessions but may feel rushed.', status: 'open' });
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}

// ============================================================
// AI Chatbot for Attendees
// Answers attendee questions about an event using event data.
// ============================================================

export function generateChatbotResponse(
  input: string,
  ctx: {
    event: Pick<Event, 'title' | 'description' | 'start_date' | 'end_date' | 'category' | 'price' | 'currency' | 'max_attendees' | 'status'>;
    sessions?: Session[];
    speakers?: Speaker[];
    venueName?: string;
  },
): string {
  const q = input.toLowerCase();
  const { event, sessions = [], speakers = [], venueName } = ctx;

  if (q.match(/schedule|agenda|program|session|talk|what.*on|timeline|when/)) {
    if (sessions.length === 0) return 'The full agenda for "' + event.title + '" is being finalized. Check back soon for the complete schedule!';
    const sessionList = sessions.slice(0, 5).map((s) => '• ' + s.title + ' — ' + new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + (s.room ? ' in ' + s.room : '')).join('\n');
    return 'Here is the agenda for "' + event.title + '":\n\n' + sessionList + (sessions.length > 5 ? '\n\n...and ' + (sessions.length - 5) + ' more sessions. Full details on the event page!' : '');
  }

  if (q.match(/speaker|presenter|keynote|who.*speaking|who.*presenting/)) {
    if (speakers.length === 0) return 'Speakers for "' + event.title + '" will be announced soon. Stay tuned!';
    const speakerList = speakers.slice(0, 5).map((s) => '• ' + s.name + (s.title ? ' — ' + s.title : '') + (s.company ? ' (' + s.company + ')' : '')).join('\n');
    return 'Our featured speakers at "' + event.title + '":\n\n' + speakerList + (speakers.length > 5 ? '\n\n...and ' + (speakers.length - 5) + ' more!' : '');
  }

  if (q.match(/venue|location|where|address|direction|park|how.*get/)) {
    if (!venueName) return 'The venue for "' + event.title + '" will be announced soon. We will send you directions once it is confirmed!';
    return '"' + event.title + '" will be held at ' + venueName + '. Detailed directions and parking information will be included in your confirmation email. We recommend arriving 15-20 minutes early for check-in.';
  }

  if (q.match(/ticket|price|cost|register|book|buy|how much|pay|free/)) {
    if (event.price === 0) return '"' + event.title + '" is a free event! You can register directly on the event page. Just click "Book Ticket" and complete the form to get your QR code ticket.';
    const cur = event.currency === 'INR' ? '₹' : event.currency === 'USD' ? '$' : '';
    return 'Tickets for "' + event.title + '" are ' + cur + event.price + ' each. You can book directly on the event page — just click "Book Ticket" and complete the payment form. You will receive a QR code ticket immediately after booking.';
  }

  if (q.match(/check.?in|qr|entry|enter|gate|arrive|admission/)) {
    return 'For check-in at "' + event.title + '":\n\n1. Bring your QR code ticket (on your phone is fine)\n2. Arrive 15-20 minutes before the start time\n3. Show your QR code at the entrance\n4. You will receive your badge and welcome pack\n\nIf you lose your QR code, you can find it in "My Tickets" on the platform.';
  }

  if (q.match(/date|time|when.*start|when.*end|how long|duration/)) {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const duration = Math.round((end.getTime() - start.getTime()) / 3600000);
    return '"' + event.title + '" takes place on ' + start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' from ' + start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' to ' + end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' (approximately ' + duration + ' hour' + (duration !== 1 ? 's' : '') + ').';
  }

  if (q.match(/about|what.*event|topic|theme|category|subject/)) {
    return '"' + event.title + '" is a ' + event.category + ' event. ' + (event.description || 'More details will be shared soon.');
  }

  if (q.match(/spot|seat|capacity|space|room|how many|limit|availab/)) {
    return '"' + event.title + '" has a capacity of ' + event.max_attendees + ' attendees. ' + (event.status === 'published' ? 'Tickets are available — book early to secure your spot!' : 'Ticket sales will open soon.');
  }

  if (q.match(/food|eat|drink|catering|meal|lunch|coffee|snack|refreshment/)) {
    return 'Catering details for "' + event.title + '" will be confirmed closer to the event date. Typically, refreshments are provided during breaks. Check your event confirmation email for updates!';
  }

  if (q.match(/contact|help|support|email|phone|question|assist/)) {
    return 'For any questions about "' + event.title + '", you can:\n\n• Use this chatbot for quick answers\n• Check the event page for full details\n• Contact the organizer through the platform\n\nI am here to help with anything else you need!';
  }

  if (q.match(/hello|hi|hey|greetings|howdy/)) {
    return 'Hello! Welcome to "' + event.title + '". I am your event assistant — I can help with:\n\n• Schedule and sessions\n• Speaker information\n• Venue and directions\n• Ticket and pricing\n• Check-in process\n• Event timing\n\nWhat would you like to know?';
  }

  return 'I am here to help with "' + event.title + '"! You can ask me about:\n\n• The event schedule and sessions\n• Featured speakers\n• Venue location and directions\n• Ticket pricing and booking\n• Check-in and QR codes\n• Event date and time\n• Catering and refreshments\n\nWhat would you like to know?';
}
