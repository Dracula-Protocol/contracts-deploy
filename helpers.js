function transactionCallback (err, transactionHash) {
  console.log('transactionHash', transactionHash)
    if (err) throw err;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function addMinutes(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

module.exports = {
  addDays,
  addMinutes,
  transactionCallback
}