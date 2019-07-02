const AxonToken = artifacts.require('AxonToken');
const Airdrop = artifacts.require('Airdrop');
const { toHex } = web3.utils;

require('dotenv').config();


async function addWhitelisted(contract_instance, white_address) {  
  let result = await contract_instance.isWhitelisted(white_address);
  if (result == true) {
    console.log(`${white_address} has already been whitelisted.`)
  } else {
    await contract_instance.addWhitelisted(white_address, {from: process.env.OWNER});
    result = await contract_instance.isWhitelisted(white_address);
    if (result == true) {
      console.log(`Succeed to add: ${white_address}`);
    } else {
      console.log(`Failed to add: ${white_address}`);
    }
  }
}


async function removeWhitelisted(contract_instance, white_address) {  
  let result = await contract_instance.isWhitelisted(white_address);
  if (result == false) {
    console.log(`${white_address} is not whitelisted.`)
  } else {
    await contract_instance.removeWhitelisted(white_address, {from: process.env.OWNER});
    result = await contract_instance.isWhitelisted(white_address);
    if (result == false) {
      console.log(`Succeed to remove: ${white_address}`);
    } else {
      console.log(`Failed to remove: ${white_address}`);
    }
  }
}


async function TokenTransfer(contract_instance, from_address, to_address, amount) {
  const balance_before = await contract_instance.balanceOf(to_address);
  await contract_instance.transfer(to_address, toHex(amount), {from: from_address});
  const balance_after = await contract_instance.balanceOf(to_address);
  const balance = balance_after - balance_before;
  if (balance.toString(), amount.toString()) {
    return true;
  } else {
    return false;
  }
}


async function main() {

  let network = process.argv[5];
  let address = {
    'ropsten': {
      'AxonToken': '0x68b6E45caf2E0EB51248855DE97867ff982156Fc',
      'Airdrop': '0x82D32B13645D4CA1FdAEa54AfF940cdc8bcEb067'
    },
    'mainnet': {
      'AxonToken': '0x4F2742D3BF257035caE4666e0a6fed67713e0CC5',
      'Airdrop': '0x8E6217dBFb6c810e8Eb378789F06871af91Bd108'
    },
    'kovan': {
      'AxonToken': '0x7dB6399e4098390c5c6becB579a1dFF3D1cAb3B7',
      'Airdrop': '0x41e82802f5e7FCb9B2D1DA4386fe6cEBd3aaA5e6'
    }
  };

  let version = '';
  let AxonTokenInstance = await AxonToken.at(address[network]['AxonToken']);
  let AirdropInstance = await Airdrop.at(address[network]['Airdrop']);
  version = await AxonTokenInstance.version();
  console.log(`AxonToken(${version}): ${network}:${AxonTokenInstance.address}`);
  version = await AirdropInstance.version();
  console.log(`Airdrop(${version}):   ${network}:${AirdropInstance.address}`);

  if (network !== 'mainnet') {
    // 1. Whitelist Management
    let white_address = process.env.PROXY;
    // Remove whitelist
    // await removeWhitelisted(AxonTokenInstance, white_address);
    // await removeWhitelisted(AirdropInstance, white_address);
    // Add whitelist
    // await addWhitelisted(AxonTokenInstance, white_address);
    await addWhitelisted(AirdropInstance, white_address);

    // 2. Token transfer
    let from_address = process.env.OP_ADDRESS;
    let to_address = process.env.PROXY;
    let amount = web3.utils.toWei('1000000', 'ether');
    let ret = await TokenTransfer(AxonTokenInstance, from_address, to_address, amount);
    console.log('Transfer result:', ret);

    // 3. Multisend Management
    await AxonTokenInstance.approve(AirdropInstance.address, toHex(amount), {from: process.env.PROXY});
    const allowed = await AxonTokenInstance.allowance(process.env.PROXY, AirdropInstance.address);
    if (allowed.toString() === amount.toString()) {
      const balance_before = await AxonTokenInstance.balanceOf(process.env.PROXY);
      await AirdropInstance.multisend(
        AxonTokenInstance.address,
        ['0x6150CbCF8813e6367f1A3309D751feF512078848', '0x8AdCd1DDA4905dBe1cAa84C170bbA33b23aBd3a3'],
        [web3.utils.toWei('400000', 'ether'), web3.utils.toWei('600000', 'ether')],
        {from: process.env.PROXY}
      );
      const balance_after = await AxonTokenInstance.balanceOf(process.env.PROXY);
      const balance = balance_before - balance_after;
      console.log(balance.toString(), amount.toString());
    } else {
      console.log('Not enough allowance!');
    }
  }
}


module.exports = function(callback) {
  main().then(() => callback()).catch(err => callback(err))
};