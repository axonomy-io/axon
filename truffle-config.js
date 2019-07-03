var HDWalletProvider = require('truffle-hdwallet-provider');

require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3();

module.exports = {
  mocha: {
    enableTimeouts: false
  },
  compilers: {
    solc: {
      version: '0.5.8',
      settings: {
       optimizer: {
         enabled: false,
         runs: 200
       }
      }
    }
  },
  networks: {
    'development': {
      host: 'localhost',
      port: 7545,
      network_id: '*',
    },
    'local': {
      host: 'localhost',
      port: 7545,
      network_id: '*',
    },
    'ropsten': {
      // https://faucet.metamask.io/
      // https://faucet.ropsten.be/
      provider: () => new HDWalletProvider([process.env.OWNER_PRI, process.env.PROXY_PRI, process.env.C_PRI, process.env.B_PRI, process.env.OP_PRI, process.env.TEAM_PRI], `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`, 0, 6),
      network_id: 3,
      gasPrice: web3.utils.toWei('20', 'gwei'),
      gas: 4600000,
      skipDryRun: true
    },
    'rinkeby': {
      // https://faucet.rinkeby.io/
      provider: () => new HDWalletProvider([process.env.OWNER_PRI, process.env.PROXY_PRI, process.env.C_PRI, process.env.B_PRI, process.env.OP_PRI, process.env.TEAM_PRI], `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`, 0, 6),
      network_id: 4,
      gasPrice: web3.utils.toWei('20', 'gwei'),
      gas: 4600000,
      skipDryRun: true
    },
    'kovan': {
      // https://faucet.kovan.network/
      // https://gitter.im/kovan-testnet/faucet
      provider: () => new HDWalletProvider([process.env.OWNER_PRI, process.env.PROXY_PRI, process.env.C_PRI, process.env.B_PRI, process.env.OP_PRI, process.env.TEAM_PRI], `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`, 0, 6),
      network_id: 42,
      gasPrice: web3.utils.toWei('20', 'gwei'),
      gas: 4600000,
      skipDryRun: true
    },
    'mainnet': {
      provider: () => new HDWalletProvider([process.env.OWNER_PRI, process.env.PROXY_PRI, process.env.C_PRI, process.env.B_PRI, process.env.OP_PRI, process.env.TEAM_PRI], `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`, 0, 6),
      network_id: 1,
      gasPrice: web3.utils.toWei('20', 'gwei'),
      gas: 4600000,
      skipDryRun: true
    }
  }
}
