const AxonToken = artifacts.require('AxonToken');
const Airdrop = artifacts.require('Airdrop');
const { toHex } = web3.utils;
const BigNumber = require("bignumber.js");

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


async function minedPercentage(AxonTokenInstance) {
  let total = await AxonTokenInstance.invest_mined();
  let mined_percentage = BigNumber(total).times(100).div('1e+18').div('7e+8');
  return parseFloat(mined_percentage.toString()).toFixed(4);
}


async function main() {
  let network = process.argv[5];
  let address = {
    'ropsten': {
      'AxonToken': '0x2193BA08EB51e673a74Ae3D389083C1bc38e00b6',
      'Airdrop': '0xbF49eb27ffFad3Fc1B9285E86367e2e2b2Ec0546'
    },
    'mainnet': {
      'AxonToken': '0x4F2742D3BF257035caE4666e0a6fed67713e0CC5',
      'Airdrop': '0x8E6217dBFb6c810e8Eb378789F06871af91Bd108'
    },
    'kovan': {
      'AxonToken': '0xC51544048B4F25eeCCaaa865809921294B70B61a',
      'Airdrop': '0x71581E07Ea6DA3b4713FC27D93C30C7369a6779E'
    },
    'local': {
      'AxonToken': '0xA2f89227DEBFBC48e1187ad75aFbeB68bb193738',
      'Airdrop': '0x53f2032E106Dd00d7C373FfE870B9947831Ed46f'
    }
  };

  let version = '';
  let AxonTokenInstance = await AxonToken.at(address[network]['AxonToken']);
  let AirdropInstance = await Airdrop.at(address[network]['Airdrop']);
  version = await AxonTokenInstance.version();
  console.log(`AxonToken(${version}):    ${network}:${AxonTokenInstance.address}`);
  version = await AirdropInstance.version();
  console.log(`Airdrop(${version}):      ${network}:${AirdropInstance.address}`);
  let mined_percentage = await minedPercentage(AxonTokenInstance);
  console.log(`Mined percentage: ${mined_percentage}%`);

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

  if (network === 'test') {
    let revenue = web3.utils.toWei('11021.7688702927', 'ether');
    let difficulty = web3.utils.toWei('0.028888', 'ether');
    let alpha = web3.utils.toWei('1', 'ether');
    let total = await AxonTokenInstance.mine(toHex(difficulty), toHex(revenue), toHex(alpha), {from: process.env.OWNER});
    console.log(total);
  }
}


module.exports = function(callback) {
  main().then(() => callback()).catch(err => callback(err))
};