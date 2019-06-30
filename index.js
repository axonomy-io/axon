const AxonToken = artifacts.require('AxonToken');
const Airdrop = artifacts.require('Airdrop');

async function main() {
  let deployed = '', version = '';

  deployed = await AxonToken.deployed();
  version = await deployed.version();
  console.log(`AxonToken (${version}) deployed at ${deployed.address}`);

  deployed = await Airdrop.deployed();
  version = await deployed.version();
  console.log(`Airdrop (${version}) deployed at ${deployed.address}`);
}

module.exports = function(callback) {
  main().then(() => callback()).catch(err => callback(err))
};