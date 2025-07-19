// util.js
exports.formatResponseForDialogflow = (messages) => {
  return {
    fulfillmentMessages: messages.map(text => ({
      text: { text: [text] }
    }))
  };
};
