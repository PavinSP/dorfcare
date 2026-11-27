// The 2-minute DorfConnect demo video, scene by scene.
// Single source of truth for scripts/record-demo.mjs (automated recording) and docs/demo-video.md (manual recording).
// Times are seconds from the start of the video. Voiceover lines are sized to fit their scene at ~165 words/min.

export const VIDEO_SECONDS = 120

export const SCENES = [
  {
    id: 'intro', from: 0, to: 9, screen: 'Community map behind a title card',
    title: 'DorfConnect', subtitle: 'Care for villages without a doctor · Schweinfurt-Land',
    caption: '',
    vo: 'This is DorfConnect: care for villages without a doctor, built around five real municipalities near Schweinfurt.',
    steps: ['Title card fades in over the regional map', 'Title fades out at 0:08'],
  },
  {
    id: 'problem', from: 9, to: 21, screen: '🗺️ Community: regional map',
    caption: '9,925 people aged 65+ in five municipalities · Schweinfurt-Süd: 5 GP seats open, 15 of 36 GPs aged 60+',
    vo: 'Here, nine thousand nine hundred people are over sixty-five. In Schweinfurt-Süd, five GP seats are already empty, and fifteen of thirty-six GPs are sixty or older.',
    steps: ['Map shows Werneck, Dittelbrunn, Schonungen, Niederwerrn, Gochsheim and Schweinfurt', 'Volunteers (green), nurses from existing care services (purple)'],
  },
  {
    id: 'landline', from: 21, to: 40, screen: '☎️ Landline',
    caption: 'No smartphone needed: Clara calls the landline at 9:00 · press 1 = I’m fine',
    vo: 'Most people over eighty have a landline, not a smartphone. So every morning at nine, Clara calls Gertrud.',
    clara: { at: 28.5, text: 'Good morning Mrs Klein, this is Clara from DorfConnect. If you are fine, press one.' },
    steps: ['Click the ☎️ Landline tab (Gertrud is selected)', 'Click "▶ Start the 09:00 call" → phone rings', 'Click "📞 Pick up" → Clara speaks', 'Press key 1 → check-in turns green "via landline"'],
  },
  {
    id: 'request', from: 40, to: 58, screen: '👵 Resident (Maria) → 🗺️ Community',
    caption: 'Help request → trusted volunteers within 5 km · the map shows an approximate area, never the home',
    vo: 'Maria needs a ride to the doctor. Her request goes to trusted volunteers within five kilometres. The map shows only an approximate area, never her home.',
    steps: ['Click 👵 Resident → "I need some help"', 'Click "Ride to doctor" → "Ask for help"', 'Click 🗺️ Community → red circle in Werneck with dashed lines to the asked volunteers'],
  },
  {
    id: 'volunteer', from: 58, to: 72, screen: '🙋 Volunteer (Anna)',
    caption: 'Regular helpers are asked first · the address is shared only after accepting',
    vo: 'Anna has helped Maria four times, so she is asked first. Only after she accepts does she see the address.',
    steps: ['Click 🙋 Volunteer → card shows "Your regular: Maria · 4 visits · asked for you"', 'Click "Accept" → exact address and the route appear on the map'],
  },
  {
    id: 'nurse', from: 72, to: 94, screen: '🩺 Doctor → 👩‍⚕️ Nurse (Lena)',
    caption: 'Medical questions never go to volunteers · a nurse from an existing care service visits, the doctor joins by video',
    vo: 'Medical questions never go to volunteers. The doctor sends Lena, a nurse from a local care service that already exists, and joins by video.',
    steps: ['Click 🩺 Doctor → Maria’s blood-pressure question is in the call-back queue (prepared before recording)', 'Task "Assisted tele-consult" → "Send nurse"', 'Click 👩‍⚕️ Nurse (Lena) → "Accept" → "Start tele-consult"', 'Type the doctor’s note → "End & document"'],
  },
  {
    id: 'rotation', from: 94, to: 106, screen: '🩺 Doctor: rotation and village-hall sites',
    caption: 'Doctors rotate through village halls as KVB-approved branch practices · until approval: video + nurse at home',
    vo: 'Doctors rotate through the village halls as approved branch practices. Until approval, the day runs as video with a nurse at home.',
    steps: ['Click 🩺 Doctor → scroll to the weekly rotation', 'Scroll to "Village-hall consultations": Schonungen approved, Werneck applied, Gochsheim not yet'],
  },
  {
    id: 'family', from: 106, to: 111, screen: '👪 Family (Peter, Maria’s son)',
    caption: 'Family sees check-ins, help and helpers · never medical details',
    vo: 'Maria’s son in Munich sees that she is looked after.',
    steps: ['Click 👪 Family → Peter sees today’s status, Anna on the way, who helps Mum'],
  },
  {
    id: 'outro', from: 111, to: 120, screen: 'Closing card',
    title: 'Free for residents.', subtitle: 'Paid by municipalities, care insurance and GP practices · connecting the nurses, doctors and neighbours who already exist',
    caption: '',
    vo: 'Free for residents. Paid by municipalities, care insurance and practices. DorfConnect.',
    steps: ['Closing card fades in'],
  },
]
