require('dotenv').config(); // Load .env variables
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const dialogflow = require('@google-cloud/dialogflow');
const twilio = require('twilio');
const axios = require('axios');
const db = require('./db/db'); // Adjust path if needed

const app = express();
const MessagingResponse = twilio.twiml.MessagingResponse;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Dialogflow Config
const projectId = 'rough-igui';
const fs = require('fs');
const path = require('path');

// Write key file from env var (only in Render)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const keyPath = path.join(__dirname, 'dialogflow-key.json');
  fs.writeFileSync(keyPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
}

// Then initialize Dialogflow client
const sessionClient = new dialogflow.SessionsClient();



// WhatsApp → Dialogflow handler
app.post('/twilio-webhook', async (req, res) => {
  const userMessage = req.body.Body;
  const sessionId = req.body.From || uuidv4();
  const sessionPath = `projects/${projectId}/agent/sessions/${sessionId}`;

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: userMessage,
        languageCode: 'en',
      },
    },
  };

  const twiml = new MessagingResponse();

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    const webhookResponse = await axios.post('http://localhost:3030/', {
      queryResult: result,
      phoneNumber: sessionId.replace('whatsapp:', '')  // pass phoneNumber here
    });

    const reply = webhookResponse.data.fulfillmentText || "Sorry, I didn't understand that.";
    console.log("Reply after webhook processing:", reply);
    twiml.message(reply);
  } catch (err) {
    console.error("Error in Twilio webhook:", err.message);
    twiml.message("There was a problem understanding you. Please try again later.");
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Dialogflow Fulfillment Handler
app.post('/', async (req, res) => {
   const session = req.body.session;
  const userInput = req.body.queryResult.queryText.trim();
  const queryResult = req.body.queryResult || {};
const intent = queryResult.intent?.displayName || 'UnknownIntent';

  const activeContexts = req.body.queryResult.outputContexts?.map(ctx => ctx.name.split('/').pop()) || [];

  // Log intent and active contexts
  console.log("Dialogflow Fulfillment webhook hit.");
  console.log("User Input:", userInput);
 console.log("Intent:", intent);

  console.log("Active Contexts:", activeContexts);

  const hasContext = (ctxName) =>
    activeContexts.includes(ctxName);

  let response = {};
  //const goBackOptions =
  //"🔁 Options:\n" +
 // "1️⃣ Go Back to Previous Menu\n" +
 // "2️⃣ Back to Main Menu\n" +
 // "3️⃣ End Conversation";

try{
switch (intent) {
  
  case 'Default Welcome Intent':
    response = {
      fulfillmentText:
        "👋 Welcome to VoteAssist Idukki!\n\n" +
        "Please select a section:\n\n" +
        "1️⃣ General Instructions\n\n" +
        "2️⃣ Voter Services\n\n" +
        "3️⃣ BLO / ERO / DEO Info",
      outputContexts: [
        { name: `${session}/contexts/main-menu`, lifespanCount: 10 },
        { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
        { name: `${session}/contexts/general-menu`, lifespanCount: 0 },
        { name: `${session}/contexts/Voterservices-menu`, lifespanCount: 0 },
        { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 } 
      ],
    };
    break;

  case 'MenuSelectionIntent':
  
    if (userInput === '1') {
      response = {
        fulfillmentText:
          "🗂 General Instructions Menu:\n\n" +
          "1️⃣ How to vote\n\n" +
          "2️⃣ Valid ID proofs instead of voter ID\n\n" +
          "3️⃣ 🔙 Back to Main Menu",
        outputContexts: [
          { name: `${session}/contexts/general-menu`, lifespanCount: 10 },
          { name: `${session}/contexts/main-menu`, lifespanCount: 0 },
          { name: `${session}/contexts/Voterservices-menu`, lifespanCount: 0 },
          { name:`${session}/contexts/general-submenu`, lifespanCount: 0 },
        ],
      };
    } 
    else if (userInput === '2') {
      response = {
        fulfillmentText:
          "🗂 Voter Services\n\n" +
          "1️⃣ How to enroll as a new voter\n\n" +
          "2️⃣ How to delete voter ID\n\n" +
          "3️⃣ How to shift address/change constituency\n\n" +
          "4️⃣ How to download Voter ID(E-Epic)\n\n"+
          "5️⃣ Search your details in electoral roll",

       outputContexts: [
  { name: `${session}/contexts/voterservices-menu`, lifespanCount: 10 },
  { name: `${session}/contexts/general-menu`, lifespanCount: 0 },
  { name: `${session}/contexts/main-menu`, lifespanCount: 0 },
  { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
  { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 } // optional cleanup
]

      };
    } 
      else {
      response = {
        fulfillmentText: "Enter valid option🔧 Section not implemented yet.",
        outputContexts: [
        { name: `${session}/contexts/main-menu`, lifespanCount: 10 },
        { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
        { name: `${session}/contexts/general-menu`, lifespanCount: 0 },
        { name: `${session}/contexts/Voterservices-menu`, lifespanCount: 0 },
        { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 } 
      ],
      };
    }
    break;

    case 'RestartIntent':
  response = {
    fulfillmentText: '👋 Welcome to VoteAssist Idukki!\n\n' +
      'Please select a section:\n\n' +
      '1️⃣ General Instructions\n\n' +
      '2️⃣ Voter Services\n\n' +
      '3️⃣ BLO / ERO / DEO Info\n\n' +
      "4️⃣ About your polling station\n\n" +
      'Type a number to continue.',
    outputContexts: [
      { name: `${req.body.session}/contexts/main-menu`, lifespanCount: 4 },
      { name: `${req.body.session}/contexts/awaitingvoterid`, lifespanCount: 0 }
    ]
  };
  return res.json(response);

 case 'Voterservicesoptions': {
  if (userInput === '1') {
    try {
      const [rows] = await db.query('SELECT content FROM instruction WHERE id = ?', ['1']);
      response = {
        fulfillmentText: rows.length > 0 ? rows[0].content : 'No instructions found.',
        
        outputContexts: [
          { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    } catch (err) {
      console.error('DB Error:', err);
      response = {
        fulfillmentText: 'An error occurred while fetching voter services info.',
        outputContexts: [
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    }
  }
else if (userInput === '2') {
  try {
      const [rows] = await db.query('SELECT content FROM instruction WHERE id = ?', ['3']);
      response = {
        fulfillmentText: rows.length > 0 ? rows[0].content : 'No instructions found.',
        outputContexts: [
          { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    } catch (err) {
      console.error('DB Error:', err);
      response = {
        fulfillmentText: 'An error occurred while fetching voter services info.',
        outputContexts: [
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    }
  }
  else if (userInput === '3') {
  try {
      const [rows] = await db.query('SELECT content FROM instruction WHERE id = ?', ['2']);
      response = {
        fulfillmentText: rows.length > 0 ? rows[0].content : 'No instructions found.',
        outputContexts: [
          { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    } catch (err) {
      console.error('DB Error:', err);
      response = {
        fulfillmentText: 'An error occurred while fetching voter services info.',
        outputContexts: [
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
      };
    }
  }
else if (userInput === '4') {
  response = {
          fulfillmentText:
            '1. Visit voters service portal www.voters.eci.gov.in.\n' +
            '2. Login the website.\n' +
            '3. Select download e-EPIC.\n' +
            '4. Verify by entering your EPIC number.\n' +
            '5. Download your e-EPIC.\n' ,
            //goBackOptions,
    
             outputContexts: [
          { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
        ],
        };
      }
  else if (userInput === '5') {
  response = {
    fulfillmentText: '📝 Please enter your *full name* to search for your voter details.',
    outputContexts: [
      {
        name: `${session}/contexts/awaiting_full_name`,
        lifespanCount: 3
      },
      {
        name: `${session}/contexts/voterservices-submenu`,
        lifespanCount: 5
      },
      {name: `${session}/contexts/voterservices-menu`,},
    ]
  };
}


else {
     response = {
       fulfillmentText: "❌ Invalid option. Please enter a valid option",
       outputContexts: [
  { name: `${session}/contexts/voterservices-menu`, lifespanCount: 10 },
  { name: `${session}/contexts/general-menu`, lifespanCount: 0 },
  { name: `${session}/contexts/main-menu`, lifespanCount: 0 },
  { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
  { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 } // optional cleanup
]
      };
    }
   
  break; // ✅ MUST ADD THIS TO PREVENT FALLTHROUGH
  }
case 'ProvideFullName': {
  const fullName = req.body.queryResult?.parameters?.fields?.full_name?.stringValue;

  if (!fullName) {
    console.log("⚠️ ProvideFullName intent triggered but full_name is undefined. Skipping.");
    break;
  }

  console.log("📛 Full Name received:", fullName);

  response = {
    fulfillmentText: '📅 Now, please enter your *date of birth* (YYYY-MM-DD).',
    outputContexts: [
      {
        name: `${session}/contexts/awaiting_dob`,
        lifespanCount: 3
      },
      {
        name: `${session}/contexts/temp_voterdata`,
        lifespanCount: 6,
        parameters: {
          full_name: fullName
        }
      }
    ]
  };
  break;
}


case 'ProvideDOB': {
  const rawDob = req.body.queryResult?.parameters?.fields?.date?.stringValue;
  const dob = rawDob ? rawDob.split('T')[0] : undefined;

  const tempContext = req.body.queryResult.outputContexts?.find(ctx =>
    ctx.name.includes('temp_voterdata')
  );

  console.log("🧠 temp_voterdata context:", JSON.stringify(tempContext, null, 2));

  let fullName;
  if (tempContext?.parameters?.full_name) {
    fullName = tempContext.parameters.full_name;
  } else if (tempContext?.parameters?.fields?.full_name?.stringValue) {
    fullName = tempContext.parameters.fields.full_name.stringValue;
  }

  console.log("🧾 Raw parameters:", JSON.stringify(req.body.queryResult?.parameters?.fields, null, 2));
  console.log("🎂 DOB received:", dob);
  console.log("📛 Full Name from temp context:", fullName);

  if (!dob || !fullName) {
    response = {
      fulfillmentText: '⚠️ Missing DOB or name. Please restart the process.',
    };
    break;
  }

response = {
  fulfillmentText: '👪 Lastly, enter your *father’s or relative’s name*.',
  outputContexts: [
    {
      name: `${session}/contexts/awaiting_relative`,
      lifespanCount: 3
    },
  {
  name: `${session}/contexts/temp_voterdata`,
  lifespanCount: 6,
parameters: {
  fields: {
    full_name: { stringValue: fullName, kind: 'stringValue' },
    date: { stringValue: dob, kind: 'stringValue' },
    date_of_birth: { stringValue: dob, kind: 'stringValue' }
  }
}
  }
  ]
};

  break;
}

case 'ProvideRelativeName': {
  const relativeName = req.body.queryResult?.parameters?.fields?.relative_name?.stringValue;

  const tempContext = req.body.queryResult.outputContexts?.find(ctx =>
    ctx.name.includes('temp_voterdata')
  );

  let fullName, dob;

  if (tempContext?.parameters?.fields) {
    fullName = tempContext.parameters.fields.full_name?.stringValue;

    // ✅ Extract only date part if timestamp is present
    const rawDob =
      tempContext.parameters.fields.date_of_birth?.stringValue ||
      tempContext.parameters.fields.date?.stringValue;

    dob = rawDob ? rawDob.split('T')[0] : undefined;
  }

  console.log("📛 Full Name:", fullName);
  console.log("🎂 DOB:", dob);
  console.log("👪 Relative Name:", relativeName);

  if (!relativeName || !fullName || !dob) {
    response = {
      fulfillmentText: '⚠️ Missing some data. Please restart the process by entering your full name.',
    };
    break;
  }

  const query = `
    SELECT * FROM users
    WHERE full_name = ? AND date_of_birth = ? AND relative_name = ?
  `;

  try {
    const [rows] = await db.execute(query, [fullName, dob, relativeName]);

    if (rows.length === 0) {
      response = {
        fulfillmentText: '❌ No matching voter record found. Please check your inputs or try again.',
      };
    } else {
      const voter = rows[0];

     const formattedDob = voter.date_of_birth
  ? new Date(voter.date_of_birth).toISOString().split('T')[0]
  : 'N/A';

response = {
  fulfillmentText: `✅ *Voter Details Found:*
Name: *${voter.full_name}*
DOB: *${formattedDob}*
Relative: *${voter.relative_name}*
Voter ID: *${voter.voter_id}*
Booth: *${voter.part_name}*
Booth No: *${voter.part_number}*
Assembly Constituency name: *${voter.assembly_constituency_name}*
Address: *${voter.house_address}*`,
  outputContexts: [
          { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/voterservices-menu`, lifespanCount: 0 },
          { name: `${session}/contexts/awaiting_relative`, lifespanCount: 0 },
          { name: `${session}/contexts/awaiting_dob`, lifespanCount: 0 },
        ],
       
};


    }
  } catch (error) {
    console.error("❌ MySQL Query Error:", error);
    response = {
      fulfillmentText: '⚠️ Error accessing voter records. Please try again later.',
    };
  }

  break;
}



  case 'GeneralInstructionsOptions':{
    if (userInput === '1') {
      response = {
        fulfillmentText:
           "🗳 How to Vote:\n\n" +
        "• Visit your polling station with voter ID.\n" +
        "• Visit the first polling officer to verify your ID.\n" +
        "• Get the ink mark, signature, and voter slip from the second polling officer.\n" +
        "• Visit the third polling officer for ink verification and activation of the ballot unit.\n" +
        "• Cast your vote by clicking the button next to the candidate.\n" +
        "• Verify your choice with the VVPAT slip.\n\n" +
        "📽 Watch this video for more details:\nhttps://youtu.be/XGJQNKFYqYI?si=VzRIkN11uyadzqDo\n\n" +
        "3️⃣ Go Back to General Instructions Menu",

        outputContexts: [
          { name: `${session}/contexts/general-submenu`, lifespanCount: 5 },
          { name:`${session}/contexts/general-menu`, lifespanCount: 0 },
        ],
      };
     } else if (userInput ==='2'){
        response = {
          fulfillmentText:
          "🪪 Approved Identity Documents for Voting:\n\n" +
        "• Aadhaar Card\n" +
        "• PAN Card\n" +
        "• Unique Disability ID (UDID) Card\n" +
        "• Service Identity Card\n" +
        "• Passbook with Photo by Bank/Post Office\n" +
        "• Health Insurance Smart Card (Ministry of Labour)\n" +
        "• Driving License\n" +
        "• Indian Passport\n" +
        "• Smart Card by RGI under NPR\n" +
        "• Pension Document with Photograph\n" +
        "• ID Card for MPs/MLAs/MLCs\n" +
        "• MGNREGA Job Card\n\n" +
        "⿣ Go Back to General Instructions Menu",
        outputContexts: [
          { name: `${session}/contexts/general-submenu`, lifespanCount: 5 },
          { name: `${session}/contexts/general-menu`, lifespanCount: 0 },
        ],
      };
    }
    // else if (userInput === '3') {
      // Back to Main Menu
      //response = {
        //fulfillmentText:
         // "👋 Welcome to VoteAssist Idukki!\n\n" +
         // "Please select a section:\n\n" +
        //  "⿡ General Instructions\n" +
        //  "⿢ Voter Services\n" +
         // "⿣ BLO / ERO / DEO Info",
       // outputContexts: [
         // { name: ${session}/contexts/main-menu, lifespanCount: 10 },
       //   { name: ${session}/contexts/general-menu, lifespanCount: 0 },
     //   ],
   //   };
   // } 
   else {
     response = {
       fulfillmentText: "❌ Invalid option. Please enter a valid option",
        outputContexts: [
          { name: `${session}/contexts/general-menu`, lifespanCount: 10 },
          { name: `${session}/contexts/main-menu`, lifespanCount: 0 },
          { name: `${session}/contexts/Voterservices-menu`, lifespanCount: 0 },
          { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
        ],
      };
    }
    break;
  }
  case  'Back to voterservices menu from voterservices submenu':{
    console.log("Going back to Voterservices-menu from submenu");
  response = {
    fulfillmentText:
     "🗂 Voter Services\n\n" +
          "1️⃣ How to enroll as a new voter\n\n" +
          "2️⃣ How to delete voter ID\n\n" +
          "3️⃣ How to shift address/change constituency\n\n" +
          "4️⃣ How to download Voter ID(E-Epic)\n\n" +
          "5️⃣ Search your details in electoral roll",


    outputContexts: [
      
        { name: `${session}/contexts/voterservices-menu`, lifespanCount: 5 },
        { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 },
        
    ],
  };
  break;
}
case 'Back to mainmenu from voterservices menu':{
  console.log("Going back to mainmenu from voterservices menu");
  response = {
    fulfillmentText:
     
      "Please select a section:\n\n" +
      "1️⃣ General Instructions\n\n" +
      "2️⃣ Voter Services\n\n" +
      "3️⃣ BLO / ERO / DEO Info\n\n" +
      "Type a number to continue.",
    outputContexts: [
      
       { name: `${req.body.session}/contexts/main-menu`,lifespanCount: 5},
        {name: `${req.body.session}/contexts/voterservices-menu`,lifespanCount: 0},
       { name: `${session}/contexts/voterservices-submenu`, lifespanCount: 0 },
    ],
  };
  break;
}



case 'Back to generalmenu from generalsubmenu': {
  console.log("Going back to general-menu from submenu");
  response = {
    fulfillmentText:
      "🗂 General Instructions Menu:\n\n" +
      "1️⃣ How to vote\n\n" +
      "2️⃣ Valid ID proofs instead of voter ID\n\n" +
      "3️⃣ Back to Main Menu 🔙",
    outputContexts: [
      {
        name: `${req.body.session}/contexts/general-menu`,
        lifespanCount: 5,
      },
      {
        name: `${req.body.session}/contexts/general-submenu`,
        lifespanCount: 0,
      },
    ],
  };
  break;
}

case 'Back to mainmenu from general': {
  const activeContexts = req.body.queryResult.outputContexts.map(c => c.name.split('/').pop());
if (activeContexts.includes('general-menu') || activeContexts.includes('voterservices-menu')) {
   // Proceed with BackToMainMenu logic
}

  console.log("Going back to main-menu from general-menu");
  response = {
    fulfillmentText:
      
      "Please select a section:\n\n" +
      "1️⃣ General Instructions\n\n" +
      "2️⃣ Voter Services\n\n" +
      "3️⃣ BLO / ERO / DEO Info\n\n" +
      "Type a number to continue.",
    outputContexts: [
      {
        name: `${req.body.session}/contexts/main-menu`,
        lifespanCount: 6,
      },
      {
        name: `${req.body.session}/contexts/general-menu`,
        lifespanCount: 0,
      },
      {
          name: `${session}/contexts/voterservices-menu`,
          lifespanCount: 0,
        },
      {
        name: `${req.body.session}/contexts/general-submenu`,
        lifespanCount: 0,
      },
    ],
  };
  break;
}

  //case 'HowToVoteSubmenu':
    //if (userInput === '3') {
      // Back to General Menu
      response = {
        fulfillmentText:
          "🗂 General Instructions Menu:\n\n" +
          "1️⃣ How to vote\n" +
          "2️⃣ Valid ID proofs instead of voter ID\n" +
          "3️⃣ 🔙 Back to Main Menu",
        outputContexts: [
          { name: `${session}/contexts/general-menu`, lifespanCount: 10 },
          { name: `${session}/contexts/general-submenu`, lifespanCount: 0 },
        ],
      };
    //} else {
      response = {
        fulfillmentText: "❌ Invalid input. Type 3 to go back.",
      };
    //}
    //break;

    
      case 'Default Fallback Intent':
        response = { fulfillmentText: 'I didn’t understand that. Can you say it differently?' };
        break;
  

      case 'VoterIdStatus': {
        const [rows] = await db.query('SELECT content FROM instruction WHERE id = ?', ['10']);
        response = rows.length > 0
          ? { fulfillmentText: rows[0].content }
          : { fulfillmentText: 'No instructions found.' };
        break;
      }

      case 'UpdateVoterDetail':
        response = {
          fulfillmentText:
            '1. Install voter helpline app.\n' +
            '2. Login or create account.\n' +
            '3. Select voter registration.\n' +
            '4. Select “Correction of entries (FORM 8)”.\n' +
            '5. Enter your EPIC number.\n' +
            '6. Edit the details you want to update.\n' +
            '7. Upload the address proof.\n' +
            '8. Submit the form.',
        };
        break;

      case 'FindPollingStation':
        response = {
          fulfillmentText:
            '1. Visit www.voters.eci.gov.in\n' +
            '2. Login and click “Know your polling station & officer”.\n' +
            '3. Enter your EPIC number.\n' +
            '4. Your polling station and BLO details will be displayed.',
        };
        break;

    case 'voterdetails': {
const rawParams = req.body.queryResult?.parameters?.fields || {};
const fullName = rawParams['full_name']?.stringValue?.trim();
const phoneNumber = req.body.phoneNumber?.trim();

console.log("Full name received:", fullName);
console.log("phone number received:", phoneNumber);
  if (!fullName) {
    response = {
      fulfillmentText: 'Please provide your full name so I can find your voter details.',
      outputContexts: [
        {
          name: `${req.body.session}/contexts/awaiting_full_name`,
          lifespanCount: 3 // Changed from 2 to 3 to avoid clash
        }
      ]
    };
    break;
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE full_name = ? AND phone_number = ?',
      [fullName, phoneNumber]
    );

    if (rows.length === 0) {
      response = {
        fulfillmentText: 'No voter details found for the provided name and phone number.',
      };
    } else {
      const voter = rows[0];
      response = {
        fulfillmentText:
          ` VOTER DETAILS:\n` +
          ` Voter ID: ${voter.voter_id}\n` +
          ` Name: ${voter.full_name}\n` +
          ` Relative's Name: ${voter.fathers_name}\n` +
          ` Gender: ${voter.gender}\n` +
          ` DOB: ${voter.date_of_birth}\n` +
          ` Address: ${voter.house_address}, ${voter.place}, ${voter.district}, ${voter.state} - ${voter.pincode}\n` +
          ` Assembly Constituency:  ${voter.assembly_constituency_name}\n` +
          ` Part: ${voter.part_number} - ${voter.part_name}\n` +
          ` Polling Station: ${voter.polling_station_address}`,
      };
    }
  } catch (dbErr) {
    console.error('DB error in voterdetails:', dbErr.message);
    response = {
      fulfillmentText: 'An error occurred while fetching your details. Please try again later.',
    };
  }
  break;
}


case 'GetBLOByPollingStation': {
  const rawParams = req.body.queryResult?.parameters?.fields || {};
  const voterId = rawParams['voter_id']?.stringValue?.trim();

  if (!voterId) {
    response = {
      fulfillmentText: 'Please provide your voter ID so I can find the BLO for your area.',
      outputContexts: [
        {
          name: `${req.body.session}/contexts/awaiting_voter_id`,
          lifespanCount: 4 // Changed from 2 to 4 to avoid clash
        }
      ]
    };
    break;
  }

  try {
    // Step 1: Get polling station address from users table using voter_id
    const [userRows] = await db.query(
      'SELECT polling_station_address FROM users WHERE voter_id = ?',
      [voterId]
    );

    if (userRows.length === 0) {
      response = {
        fulfillmentText: '❌ No polling station found for the provided voter ID.',
      };
      break;
    }

    const pollingStation = userRows[0].polling_station_address;

    // Step 2: Get BLO name from blo table using polling station
    const [bloRows] = await db.query(
      'SELECT blo_name FROM blo WHERE polling_station_address = ?',
      [pollingStation]
    );

    if (bloRows.length === 0) {
      response = {
        fulfillmentText: `✅ Polling station: ${pollingStation}\n❌ No BLO information available.`,
      };
    } else {
      const bloName = bloRows[0].blo_name;
      response = {
        fulfillmentText: ` BLO Details:\n Polling Station: ${pollingStation}\n BLO Name: ${bloName}`,
      };
    }

  } catch (error) {
    console.error('Error in BLO info lookup:', error.message);
    response = {
      fulfillmentText: '⚠ An error occurred while fetching BLO details. Please try again later.',
    };
  }

  break;
}



      case 'pollingLocation': {
  const rawParams = req.body.queryResult?.parameters?.fields || {};
  const voterId = rawParams['voter_id']?.stringValue?.trim();

  if (!voterId) {
    response = {
      fulfillmentText: 'Please provide your voter ID to get your polling location.',
      outputContexts: [
        {
          name: `${req.body.session}/contexts/awaiting_voter_id`,
          lifespanCount: 5 // Changed from 2 to 5 to avoid clash
        }
      ]
    };
    break;
  }

  try {
    const [rows] = await db.query(
      'SELECT polling_station_address FROM users WHERE voter_id = ?',
      [voterId]
    );

    if (rows.length === 0) {
      response = {
        fulfillmentText: 'No polling station found for the given voter ID.',
      };
    } else {
      const pollingAddress = rows[0].polling_station_address;
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pollingAddress)}`;

      response = {
        fulfillmentText:
          `Your Polling Station Address:\n${pollingAddress}\n\n📍 Location on Map:\n${mapsLink}`,
      };
    }
  } catch (err) {
    console.error('DB error in pollingLocation:', err.message);
    response = {
      fulfillmentText: 'There was an error fetching your polling location. Please try again later.',
    };
  }

  break;
}
      default:
        console.log(`Unhandled intent: ${intentName}`);
        response = { fulfillmentText: 'I could not understand your request.' };
    }
    } catch (error) {
    console.error('Fulfillment webhook error:', error.message);
    response = { fulfillmentText: 'Sorry, something went wrong.' };
  }

  res.json(response);
});

// Health check route
app.get('/', (req, res) => {
  res.send('VoteAssist webhook server is running.');
});

// Start server
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
