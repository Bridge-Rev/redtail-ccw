const axios = require("axios")

exports.main = async (event, callback) => {
  const PRIVATE_APP_KEY = process.env.PRIVATE_APP_KEY
  const REDTAIL_USERKEY = process.env.REDTAIL_USERKEY
  const contactId = event.inputFields['hs_object_id']
  const emailAddress = event.inputFields["email"]
  const phone = event.inputFields["phone"]
  const firstName = event.inputFields["firstname"]
  const lastName = event.inputFields["lastname"]

  let meetings = []
  let meeting = {}
  let calls = []
  let call = {}
  let emails = []
  let email = {}
  let notes = []
  let note = {}

  //Get meetings associated with contact
  await axios.get("https://api.hubapi.com/crm/v3/objects/contacts/" + contactId + "/associations/meeting",
  {
    headers: {
      "Authorization": "Bearer " + PRIVATE_APP_KEY
    }  
  })
  .then(response => meetings = response.data.results)

  //Get meeting info from id
  if (meetings.length) {
    const meetingId = meetings[meetings.length - 1].id
    await axios.get("https://api.hubapi.com/crm/v3/objects/meetings/" + meetingId + "?properties=hs_timestamp,hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_location,hs_meeting_external_url,hs_internal_meeting_notes,hs_meeting_outcome",
    {
      headers: {
        "Authorization": "Bearer " + PRIVATE_APP_KEY
      }
    })
    .then(response => meeting = response.data.properties)
  }

  //Get calls associated with contact
  await axios.get("https://api.hubapi.com/crm/v3/objects/contacts/" + contactId + "/associations/call",
  {
    headers: {
      "Authorization": "Bearer " + PRIVATE_APP_KEY
    }  
  })
  .then(response => calls = response.data.results)

  //Get call info from id
  if (calls.length) {
    const callId = calls[calls.length - 1].id
    await axios.get("https://api.hubapi.com/crm/v3/objects/calls/" + callId + "?properties=hs_timestamp,hs_call_title,hs_call_status,hs_call_from_number,hs_call_to_number,hs_call_duration,hs_call_body,hs_call_recording_url",
    {
      headers: {
        "Authorization": "Bearer " + PRIVATE_APP_KEY
      }
    })
    .then(response => call = response.data.properties)
  }

  //Get emails associated with contact
  await axios.get("https://api.hubapi.com/crm/v3/objects/contacts/" + contactId + "/associations/email",
  {
    headers: {
      "Authorization": "Bearer " + PRIVATE_APP_KEY
    }  
  })
  .then(response => emails = response.data.results)

  //Get email info from id
  if (emails.length) {
    const emailId = emails[emails.length - 1].id
    await axios.get("https://api.hubapi.com/crm/v3/objects/emails/" + emailId + "?properties=hs_timestamp,hs_email_sender_email,hs_email_sender_firstname,hs_email_sender_lastname,hs_email_status,hs_email_subject,hs_email_text,hs_email_to_email,hs_email_to_firstname,hs_email_to_lastname",
    {
      headers: {
        "Authorization": "Bearer " + PRIVATE_APP_KEY
      }
    })
    .then(response => email = response.data.properties)
  }

  //Get notes associated with contact
  await axios.get("https://api.hubapi.com/crm/v3/objects/contacts/" + contactId + "/associations/note",
  {
    headers: {
      "Authorization": "Bearer " + PRIVATE_APP_KEY
    }  
  })
  .then(response => notes = response.data.results)

  //Get note info from id
  if (notes.length) {
    const noteId = notes[notes.length - 1].id
    await axios.get("https://api.hubapi.com/crm/v3/objects/notes/" + noteId + "?properties=hs_timestamp,hs_note_body",
    {
      headers: {
        "Authorization": "Bearer " + PRIVATE_APP_KEY
      }
    })
    .then(response => note = response.data.properties)
  }

  //Get contact ID from RedTail
  let redtailContact = {}
  await axios.get("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/search?email=" + emailAddress,
  {
    headers: {
      "Authorization": "Userkeyauth " + REDTAIL_USERKEY
    }
  })
  .then(response => redtailContact = response.data.contacts[0])

  if (!redtailContact || JSON.stringify(redtailContact) === "{}") {
    await axios.get("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/search?phone_number=" + phone,
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY
      }
    })
    .then(response => redtailContact = response.data.contacts[0])
  }

  if (!redtailContact || JSON.stringify(redtailContact) === "{}") {
    await axios.get("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/search?name=" + firstName + " " + lastName,
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY
      }
    })
    .then(response => redtailContact = response.data.contacts[0])
  }

  //Determine most recent activity
  let meetingTime = 0
  let callTime = 0
  let emailTime = 0
  let noteTime = 0

  if (meeting.hs_timestamp) {
    meetingTime = new Date(meeting.hs_timestamp)
  }
  if (call.hs_timestamp) {
    callTime = new Date(call.hs_timestamp)
  }
  if (email.hs_timestamp) {
    emailTime = new Date(email.hs_timestamp)
  }
  if (note.hs_timestamp) {
    noteTime = new Date(note.hs_timestamp)
  }

  if (meetingTime > callTime
    && meetingTime > emailTime
    && meetingTime > noteTime)
  {
    pushMeeting()
  } else if (callTime > meetingTime
    && callTime > emailTime
    && callTime > noteTime)
  {
    pushCall()
  } else if (emailTime > meetingTime
    && emailTime > callTime
    && emailTime > noteTime)
  {
    pushEmail()
  } else if (noteTime > meetingTime
    && noteTime > callTime
    && noteTime > emailTime) {
    pushNote()
  }

  function pushMeeting() {
    let data = {
      category_id: 2,
      note_type: 1,
      body: "Meeting Title: " + meeting.hs_meeting_title + "\nMeeting Body: " + meeting.hs_meeting_body + "\nLocation: " + meeting.hs_meeting_location + "\nStart Time: " + meeting.hs_meeting_start_time + "\nEnd Time: " + meeting.hs_meeting_end_time + "\nExternal URL: " + meeting.hs_meeting_external_url + "\nNotes: " + meeting.hs_internal_meeting_notes + "\nOutcome: " + meeting.hs_meeting_outcome
    }

    axios.post("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/" + redtailContact.id + "/notes",
    JSON.stringify(data),
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY,
        "Content-Type": "application/json"
      }
    })
  }

  function pushCall() {
    let data = {
      category_id: 2,
      note_type: 1,
      body: "Call Title: " + call.hs_call_title + "\nFrom: " + call.hs_call_from_number + "\nTo: " + call.hs_call_to_number + "\nBody: " + call.hs_call_body + "\nRecording: " + call.hs_call_recording_url
    }

    axios.post("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/" + redtailContact.id + "/notes",
    JSON.stringify(data),
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY,
        "Content-Type": "application/json"
      }
    })
  }

  function pushEmail() {
    let data = {
      category_id: 2,
      note_type: 1,
      body: "Email Subject: " + email.hs_email_subject + "\nFrom: " + email.hs_email_sender_email + " (" + email.hs_email_sender_firstname + " " + email.hs_email_sender_lastname + ")\nTo: " + email.hs_email_to_email + " (" + email.hs_email_to_firstname + " " + email.hs_email_to_lastname + ")\nText: " + email.hs_email_text + "\nStatus: " + email.hs_email_status
    }

    axios.post("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/" + redtailContact.id + "/notes",
    JSON.stringify(data),
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY,
        "Content-Type": "application/json"
      }
    })
  }

  function pushNote() {
    let data = {
      category_id: 2,
      note_type: 1,
      body: "HubSpot Note: " + note.hs_note_body
    }

    axios.post("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/" + redtailContact.id + "/notes",
    JSON.stringify(data),
    {
      headers: {
        "Authorization": "Userkeyauth " + REDTAIL_USERKEY,
        "Content-Type": "application/json"
      }
    })
  }
}