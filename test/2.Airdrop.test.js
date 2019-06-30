const BigNumber = require("bignumber.js");
const { toHex } = web3.utils;
const Airdrop = artifacts.require('Airdrop');
const AxonToken = artifacts.require('AxonToken');
const mlog = require('mocha-logger');
// mlog.log(util.inspect(transfer));

require('dotenv').config();
require('chai').use(require('chai-bignumber')(BigNumber)).should();


contract('Airdrop', async(accounts) => {
  beforeEach(async function () {
    this.token = await AxonToken.deployed();
    this.airdrop = await Airdrop.deployed();
    // console.log('AxonToken address in truffle test', this.token.address);
    // console.log('Airdrop address in truffle test', this.airdrop.address);

    this.amount = toWei(500);
    this.mockdata = {
      recipients: [process.env.B_ADDRESS, process.env.TEAM_ADDRESS],
      values: Array(2).fill(BigNumber(this.amount)),
    };
  });

  describe('whitelist testing', function() {
    it('owner is whitelist admin', async function() {
      const result = await this.airdrop.isWhitelistAdmin(process.env.OWNER);
      assert.equal(result, true);
    });

    it('owner is in whitelist', async function() {
      const result = await this.airdrop.isWhitelisted(process.env.OWNER);
      assert.equal(result, true);
    });

    it('add to whitelist correctly', async function() {
      const result = await this.airdrop.isWhitelisted(process.env.B_ADDRESS);
      assert.equal(result, false);

      await this.airdrop.addWhitelisted(process.env.B_ADDRESS, {from: process.env.OWNER});
      const result2 = await this.airdrop.isWhitelisted(process.env.B_ADDRESS);
      assert.equal(result2, true);
    });

    it('remove whitelist correctly', async function() {
      await this.airdrop.addWhitelisted(process.env.OP_ADDRESS, {from: process.env.OWNER});
      await this.airdrop.removeWhitelisted(process.env.OP_ADDRESS, {from: process.env.OWNER});
      const result = await this.airdrop.isWhitelisted(process.env.OP_ADDRESS);
      assert.equal(result, false);
    });
  });

  describe('contract info', function() {
    it('has the correct version', async function() {
      const version = await this.airdrop.version();
      assert.equal(version.toString(), `v0`);
    });

    it('has the correct owner', async function() {
      const info = await this.airdrop.owner();
      assert.equal(info.toString().toLowerCase(), process.env.OWNER.toLowerCase());
    });
  });

  describe('multisend', function() {
    it('approve & multisend correctly', async function() {
      await this.airdrop.addWhitelisted(process.env.OP_ADDRESS, {from: process.env.OWNER});

      const approve_amount = BigNumber(this.amount).times(this.mockdata.recipients.length);
      await this.token.approve(this.airdrop.address, toHex(approve_amount), { from: process.env.OP_ADDRESS });
      const allowed = await this.token.allowance(process.env.OP_ADDRESS, this.airdrop.address);
      assert.equal(allowed.toString(), approve_amount.toFixed());

      const balance_before = await this.token.balanceOf(process.env.TEAM_ADDRESS);
      await this.airdrop.multisend(
        this.token.address,
        this.mockdata.recipients,
        this.mockdata.values,
        { from: process.env.OP_ADDRESS }
      );
      const balance_after = await this.token.balanceOf(process.env.TEAM_ADDRESS);
      const balance = balance_after - balance_before;
      assert.equal(balance.toString(), this.amount.toFixed());      
    });
  });
});

function toWei(count) {
  return count * 10 ** 18;
}