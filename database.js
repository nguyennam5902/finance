const bcrypt = require('bcryptjs');

async function comparePasswords(plainPassword, hashedPassword) {
  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (e) {
    console.error(`Error while comparing passwords: ${e.message}`);
    return false;
  }
}
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (e) {
    console.error(`Error while hashing password: ${e.message}`);
    return null;
  }
}

hashPassword('hello').then(hashResult=>{
  console.log(hashResult);
})
