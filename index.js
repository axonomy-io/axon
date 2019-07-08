const AxonToken = artifacts.require('AxonToken');
const Airdrop = artifacts.require('Airdrop');
const { toHex } = web3.utils;
const BigNumber = require("bignumber.js");

require('dotenv').config();

const address = {
  'mainnet': {
    'AxonToken': '0x423A9f4a87D3fC7030D0881c7805373cB1AC3732',
    'Airdrop': '0x9A4039b1F07526e7394e8f0c451FCf31Ce84Ad1C'
  },
  'ropsten': {
    'AxonToken': '0xd0027387d7119671cfa761085E6C5628BE33EC38',
    'Airdrop': '0x1460e4BCD2DAa0716EaF86A25E6Bc06c4279f191'
  },
  'kovan': {
    'AxonToken': '0xeB740Ee7D1F58eFb7dCa1DC1d169672d58A46CD9',
    'Airdrop': '0xfa93De65E99cb18205F37A4f2AB69098EBe64E05'
  },
  'local': {
    'AxonToken': '0x732899c29Ae114faE8Bf9feE57Bf0503A18bcB05',
    'Airdrop': '0xac679fdEAfe5cBB1C83db94D8c8A524Dbb63c85e'
  }
};


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


async function minedPercentage(AxonTokenInstance) {
  let total = await AxonTokenInstance.get_invest_mined();
  let mined_percentage = BigNumber(total).times(100).div('1e+18').div('7e+8');
  return parseFloat(mined_percentage.toString()).toFixed(4);
}

async function meta(AxonTokenInstance, AirdropInstance, network) {
  let version = await AxonTokenInstance.version();
  console.log(`AxonToken(${version}):      ${network}:${AxonTokenInstance.address}`);
  version = await AirdropInstance.version();
  console.log(`Airdrop(${version}):        ${network}:${AirdropInstance.address}`);
  let mined_percentage = await minedPercentage(AxonTokenInstance);
  console.log(`Mined percentage:   ${mined_percentage}%`);

  let current_difficulty = await AxonTokenInstance.get_current_difficulty();
  console.log(`Current difficulty: ${current_difficulty}`);
  let difficulty_list = await AxonTokenInstance.get_difficulty_list();
  for (let item of difficulty_list) {
    console.log(item.toString());
  }
}


async function main() {
  let network = process.argv[5];
  let AxonTokenInstance = await AxonToken.at(address[network]['AxonToken']);
  let AirdropInstance = await Airdrop.at(address[network]['Airdrop']);
  await meta(AxonTokenInstance, AirdropInstance, network);

  if (network === 'test') {
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

  // Mine
  if (network === 'local') {
    let revenue = web3.utils.toWei('11021.7688702927', 'ether');
    let difficulty = web3.utils.toWei('0.028888', 'ether');
    let alpha = web3.utils.toWei('1', 'ether');
    let total = await AxonTokenInstance.mine([toHex(difficulty), toHex(revenue), toHex(alpha), 0], {from: process.env.OWNER});
    // console.log(total);
  }

  if (network === 'local') {
    let revenue = web3.utils.toWei('50000000', 'ether');
    let difficulty = web3.utils.toWei('5', 'ether');
    let alpha = web3.utils.toWei('1', 'ether');
    let total = await AxonTokenInstance.mine([toHex(difficulty), toHex(revenue), toHex(alpha), 0], {from: process.env.OWNER});
    // console.log(total);
  }
}


module.exports = function(callback) {
  main().then(() => callback()).catch(err => callback(err))
};