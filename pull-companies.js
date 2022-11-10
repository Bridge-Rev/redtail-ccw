const axios = require("axios")
const hubspot = require('@hubspot/api-client')

exports.main = async (event, callback) => {
  const PRIVATE_APP_KEY = process.env.PRIVATE_APP_KEY
  const REDTAIL_USERKEY = process.env.REDTAIL_USERKEY
  const companyId = event.inputFields['hs_object_id']
  const companyName = event.inputFields["name"]
  const companyNameParameter = companyName.replace("&", "%26")
  const hubspotClient = new hubspot.Client( {"accessToken": PRIVATE_APP_KEY })

  let redtailContact = {}
  let udfs = []
  let addressToSync = {}
  let addressString = ""

  //Get contact from Redtail
  await axios.get("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/search?name=" + companyNameParameter,
  {
    headers: {
      "Authorization": "Userkeyauth " + REDTAIL_USERKEY,
      "include": "addresses, family"
    }
  })
  .then(response => redtailContact = response.data.contacts[0])

  //Determine which address to sync
  if (redtailContact.addresses.length > 0) {
    for (let i = 0; i < redtailContact.addresses.length; i++) {
      const address = redtailContact.addresses[i]
      if (address.is_primary === true && address.address_type_descripton === "Mailing") {
        addressToSync = address
        break
      } else if (address.is_primary === true && address.address_type_descripton === "Home") {
        addressToSync = address
        break
      } else if (address.is_primary === true) {
        addressToSync = address
        break
      } else if (address.address_type_descripton === "Mailing") {
        addressToSync = address
        break
      } else if (address.address_type_description === "Home") {
        addressToSync = address
        break
      } else {
        addressToSync = address
        break
      }
    } 
  }

  //Combine multi-line addresses
  if (addressToSync.secondary_address) {
    addressString = addressToSync.street_address + ", " + addressToSync.secondary_address
  } else {
    addressString = addressToSync.street_address
  }

  //Check for family name
  let familyName = ""
  if (redtailContact.family) {
    familyName = redtailContact.family.name
  }

  //Get User Defined Fields from Redtail
  await axios.get("https://smf.crm3.redtailtechnology.com/api/public/v1/contacts/" + redtailContact.id + "/udfs",
  {
    headers: {
      "Authorization": "Userkeyauth " + REDTAIL_USERKEY
    }
  })
  .then(response => udfs = response.data.contact_udfs)
  .catch(error => console.log(error))

  const investableAssetsArr = udfs.filter(item => {
    return item.contact_udf_field_name === "Investable Assets"
  })
  let investableAssets = ""
  if (investableAssetsArr.length) {
    investableAssets = investableAssetsArr[0].field_value
  }

  const employmentStatusArr = udfs.filter(item => {
    return item.contact_udf_field_name === "Employment Status"
  })
  let employmentStatus = ""
  if (employmentStatusArr.length) {
    employmentStatus = employmentStatusArr[0].field_value
  }

  const occupationArr = udfs.filter(item => {
    return item.contact_udf_field_name === "Occupation"
  })
  let occupation = ""
  if (occupationArr.length) {
    occupation = occupationArr[0].field_value
  }

  const financialInterestsArr = udfs.filter(item => {
    return item.contact_udf_field_name === "Financial Interests"
  })
  let financialInterests = ""
  if (financialInterestsArr.length) {
    financialInterests = financialInterestsArr[0].field_value
  }

  const lifeEventsArr = udfs.filter(item => {
    return item.contact_udf_field_name === "Life Events"
  })
  let lifeEvents = ""
  if (lifeEventsArr.length) {
    lifeEvents = lifeEventsArr[0].field_value
  }

  if (redtailContact.type !== "Individual") {
    //Update field values in HubSpot
    const properties = {
      "type": redtailContact.type,
      "full_name": redtailContact.full_name,
      "family_name": familyName,
      "address": addressString,
      "city": addressToSync.city,
      "state": addressToSync.state,
      "zip": addressToSync.zip,
      "investable_assets": investableAssets,
      "employment_status": employmentStatus,
      "occupation": occupation,
      "financial_interests": financialInterests,
      "life_events": lifeEvents
    }
    const SimplePublicObjectInput = { properties }
    
    try {
      const apiResponse = await hubspotClient.crm.companies.basicApi.update(companyId, SimplePublicObjectInput)
      console.log(JSON.stringify(apiResponse.body, null, 2))
    } catch (e) {
      e.message === 'HTTP request failed'
        ? console.error(JSON.stringify(e.response, null, 2))
        : console.error(e)
      throw e
    }
  }
}