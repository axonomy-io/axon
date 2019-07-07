const BigNumber = require("bignumber.js");
const { toHex } = web3.utils;
const AxonToken = artifacts.require('AxonToken');
const mlog = require('mocha-logger');
// mlog.log(util.inspect(transfer));


require('dotenv').config();
require('chai').use(require('chai-bignumber')(BigNumber)).should();

contract('AxonToken', async(accounts) => {
  const _name               = process.env.NAME;
  const _symbol             = process.env.SYMBOL;
  const _decimals           = process.env.DECIMALS;
  const _total              = process.env.TOTAL;
  const _op_address         = process.env.OP_ADDRESS;
  const _foundation_address = process.env.FOUNDATION_ADDRESS;
  const _team_address       = process.env.TEAM_ADDRESS;
  const _c_address          = process.env.C_ADDRESS;
  const _pool_address       = process.env.POOL_ADDRESS;
  const _b_address          = process.env.B_ADDRESS;
  
  const _difficulty         = toWei(0.028888);
  const _revenue            = toWei(0.028888 * 70);
  const _alpha              = toWei(0.5);
  const _staking_cnt        = 0;

  beforeEach(async function () {
    this.token = await AxonToken.deployed();
  });

  describe('contract info', function() {
    it('has the correct version', async function() {
      const version = await this.token.version();
      assert.equal(version.toString(), `v0`);
    });

    it('has the correct owner', async function() {
      const owner = await this.token.owner();
      assert.equal(owner.toString().toLowerCase(), process.env.OWNER.toLowerCase());
    });
  });

  describe('token attributes', function() {
    it('has the correct name', async function() {
      const name = await this.token.name();
      name.should.equal(_name);
    });

    it('has the correct symbol', async function() {
      const symbol = await this.token.symbol();
      symbol.should.equal(_symbol);
    });

    it('has the correct decimals', async function() {
      const decimals = await this.token.decimals();
      assert.equal(decimals.toNumber(), _decimals);
    });

    it('has the correct cap', async function() {
      const cap = await this.token.cap();
      assert.equal(cap.toString(), `${_total}`);
    });

    it('has staking mine rate', async function() {
      let ret = await this.token.get_staking_mine_rate();
      assert.equal(ret.toString(), '0');

      let rate = toWei(0.016);
      await this.token.set_staking_mine_rate(toHex(rate), {from: process.env.OWNER});
      ret = await this.token.get_staking_mine_rate();
      assert.equal(ret.toString(), rate.toFixed());

      var hasError = true;
      try {
        await this.token.set_staking_mine_rate(toHex(rate), {from: process.env.OP_ADDRESS});
        hasError = false;
      } catch(err) { }
      assert.equal(true, hasError);
    });

    it('has the correct init supply', async function() {
      const total = await this.token.totalSupply();
      const expected_total = BigNumber('0.137e+27');
      assert.equal(total.toString(), expected_total.toFixed());

      const balance_op = await this.token.balanceOf(_op_address);
      const expected_op = BigNumber('0.037e+27');
      assert.equal(balance_op.toString(), expected_op.toFixed());

      const balance_foundation = await this.token.balanceOf(_foundation_address);
      const expected_foundation = BigNumber('0.1e+27');
      assert.equal(balance_foundation.toString(), expected_foundation.toFixed());
    });
  });

  describe('mining actions', function() {
    it('percentage should be correct', async function() {
      await this.token.mine([toHex(_difficulty), toHex(_revenue), toHex(_alpha), toHex(_staking_cnt)], {from: process.env.OWNER});

      let current_difficulty = await this.token.get_current_difficulty();
      assert.equal(current_difficulty.toString(), _difficulty.toFixed());
      
      let difficulty_list = await this.token.get_difficulty_list();
      for (let item of difficulty_list) {
        console.log(item.toString());
      }

      // fundation asset: 10%
      const balance_foundation = await this.token.balanceOf(_foundation_address);
      const expected_foundation = BigNumber('0.1e+27');
      assert.equal(balance_foundation.toString(), expected_foundation.toFixed());
      
      // op asset: 3.7%
      const balance_op = await this.token.balanceOf(_op_address);
      // console.log(balance_op.toString());
      const expected_op = BigNumber('0.037e+27');
      assert.equal(balance_op.toString(), expected_op.toFixed());
      
      // team asset: 15
      const balance_team = await this.token.balanceOf(_team_address);
      const expected_team = BigNumber('15e+18');
      // console.log(balance_team.toString());
      assert.equal(balance_team.toString(), expected_team.toFixed());

      // pool asset: 70*8% = 5.6
      const balance_pool = await this.token.balanceOf(_pool_address);
      const expected_pool = BigNumber('5.6e+18');
      // console.log(balance_pool.toString());
      assert.equal(balance_pool.toString(), expected_pool.toFixed());

      // project asset: 70*92%*0.5 = 32.2
      let balance_b = await this.token.balanceOf(_b_address);
      balance_b = parseInt(balance_b.toString());
      const expected_b = BigNumber('32.2e+18');
      assert.equal(balance_b, expected_b.toFixed());

      // user asset: 70/10 + 70*92%*0.5 = 39.2
      const balance_c = await this.token.balanceOf(_c_address);
      const expected_c = BigNumber('39.2e+18');
      // console.log(balance_c.toString());
      assert.equal(balance_c.toString(), expected_c.toFixed());

      // total mined asset: 70 + 7 + 15 = 92
      const total = await this.token.totalSupply();
      const expected_total = BigNumber('0.137e+27').plus('92e+18');
      assert.equal(total.toString(), expected_total.toFixed());

      const total_revenue = await this.token.revenue();
      assert.equal(total_revenue.toString(), _revenue.toFixed());
    });

    it('should emit revenue event', async function() {
      const { logs } = await this.token.mine([toHex(_difficulty), toHex(_revenue), toHex(_alpha), toHex(_staking_cnt)], {from: process.env.OWNER});
      const total_mined = toWei(92);
      assert.equal(logs.length, 5, 'No Revenue Event emitted');
      // console.log(logs[4]);
      assert.equal(logs[4].event, 'LogRevenue');
      assert.equal(logs[4].args.total_mined.toString(), total_mined.toFixed());
      assert.equal(logs[4].args.difficulty.toString(), _difficulty.toFixed());
      assert.equal(logs[4].args.revenue.toString(), _revenue.toFixed());
      assert.equal(logs[4].args.alpha.toString(), _alpha.toFixed());
    });

    it('should mint right token', async function() {
      const to_address = process.env.B_ADDRESS;
      const amount = toWei(50);

      const balance_before = await this.token.balanceOf(to_address);
      await this.token.mint(to_address, toHex(amount), {from: process.env.OWNER});
      const balance_after = await this.token.balanceOf(to_address);
      const balance = balance_after - balance_before;

      assert.equal(balance.toString(), amount.toFixed());
    });

    it('addresses beyond whitelist are rejected', async function() {
      const result = await this.token.isWhitelisted(process.env.OP_ADDRESS);
      if (result == true) {
        await this.token.removeWhitelisted(process.env.OP_ADDRESS, {from: process.env.OWNER});
      }
      var hasError = true;
      try {
        await this.token.mine([toHex(_difficulty), toHex(_revenue), toHex(_alpha), toHex(_staking_cnt)], {from: process.env.OP_ADDRESS});
        hasError = false;
      } catch(err) { }
      assert.equal(true, hasError, "invalid address");
    });

    it('addresses in whitelist are acceptable', async function() {
      await this.token.addWhitelisted(process.env.OP_ADDRESS, {from: process.env.OWNER});
      const result = await this.token.isWhitelisted(process.env.OP_ADDRESS);
      assert.equal(result, true, 'add failed');
      var hasError = true;
      try {
        await this.token.mine([toHex(_difficulty), toHex(_revenue), toHex(_alpha), toHex(_staking_cnt)], {from: process.env.OP_ADDRESS});
        hasError = false;
      } catch(err) { }
      assert.equal(false, hasError);
    });

    it('Can not exceed the upper cap', async function() {
      var hasError = true;
      try {
        await this.token.mine([toHex(1), toHex(700000000), toHex(1), toHex(_staking_cnt)], {from: process.env.OWNER});
        hasError = false;
      } catch(err) { }
      assert.equal(true, hasError);
    });
  });

  describe('token transfer', function() {
    it('should transfer right token', async function() {
      const to_address = process.env.B_ADDRESS;
      const amount = toWei(50);

      const balance_before = await this.token.balanceOf(to_address);
      await this.token.transfer(to_address, toHex(amount), {from: process.env.OP_ADDRESS});
      const balance_after = await this.token.balanceOf(to_address);
      const balance = balance_after - balance_before;

      assert.equal(balance.toString(), amount.toFixed());
    });

    it('should multisend right token', async function() {
      const to_address = process.env.B_ADDRESS;
      const amount = toWei(50);

      const balance_before = await this.token.balanceOf(to_address);
      await this.token.multisend([to_address], [toHex(amount)], {from: process.env.OP_ADDRESS});
      const balance_after = await this.token.balanceOf(to_address);
      const balance = balance_after - balance_before;

      assert.equal(balance.toString(), amount.toFixed());
    });

    it('it should not let someone transfer tokens they do not have', async function() {
      var hasError = true;
      try {
        const balance = await this.token.balanceOf(process.env.OWNER);
        await this.token.transfer(process.env.OP_ADDRESS, balance.add(1), { from: process.env.OWNER })
        hasError = false;
      } catch(err) { }
      assert.equal(true, hasError, "Insufficient funds");
    });
  });
  
  describe('Given that I want to allow the transfer of tokens by a third party', function() {
    it('it should return the amount I allow them to transfer', async function() {
      const amount = toWei(50);
      await this.token.approve(process.env.OWNER, toHex(amount), {from: process.env.OP_ADDRESS});
      const remaining = await this.token.allowance(process.env.OP_ADDRESS, process.env.OWNER);
      assert.equal(remaining.toString(), amount.toFixed());
    });

    it('it should return the amount another allows a third account to transfer', async function() {
      const amount = toWei(98);
      await this.token.transfer(process.env.OWNER, toHex(toWei(100)), {from: process.env.OP_ADDRESS});
      await this.token.approve(process.env.OWNER, toHex(amount), {from: process.env.OP_ADDRESS});
      const remaining = await this.token.allowance(process.env.OP_ADDRESS, process.env.OWNER);
      assert.equal(remaining.toString(), amount.toFixed());
    });

    it('transferFrom should transfer tokens when triggered by an approved third party', async function() {
      // OP_ADDRESS --approve--> B_ADDRESS
      const amount = toWei(96);
      await this.token.approve(process.env.B_ADDRESS, toHex(amount), {from: process.env.OP_ADDRESS});
      const remaining = await this.token.allowance(process.env.OP_ADDRESS, process.env.B_ADDRESS);
      assert.equal(remaining.toString(), amount.toFixed());

      // B_ADDRESS -- transferFrom --> C_ADDRESS
      const balance_before = await this.token.balanceOf(process.env.C_ADDRESS);
      await this.token.transferFrom(process.env.OP_ADDRESS, process.env.C_ADDRESS, toHex(amount), {from: process.env.B_ADDRESS});
      const balance_after = await this.token.balanceOf(process.env.C_ADDRESS);
      const balance = balance_after - balance_before;
      assert.equal(balance.toString(), amount.toFixed());
    });
  });

  describe('staking actions', function() {
    it('mined by staking correctly', async function() {
      let rate = toWei(0.016);
      await this.token.set_staking_mine_rate(toHex(rate), {from: process.env.OWNER});
      ret = await this.token.get_staking_mine_rate();
      assert.equal(ret.toString(), rate.toFixed());

      // 70*2/0.016*10^18
      let staking_cnt = BigNumber(_revenue).div(_difficulty).times(2).times(toWei(1)).div(rate).times(toWei(1));
      const { logs } = await this.token.mine([toHex(_difficulty), toHex(_revenue), toHex(_alpha), toHex(staking_cnt)], {from: process.env.OWNER});
      const staking_mined = BigNumber(_revenue).div(_difficulty).times(2).times(toWei(1));
      assert.equal(logs.length, 6, 'No Revenue Event emitted');
      assert.equal(logs[0].event, 'LogStaking');
      assert.equal(logs[0].args.staking_mined.toString(), staking_mined.toFixed());
      assert.equal(logs[0].args.difficulty.toString(), _difficulty.toFixed());
      assert.equal(logs[0].args.revenue.toString(), _revenue.toFixed());
      assert.equal(logs[0].args.alpha.toString(), _alpha.toFixed());
    });
  });
});

function toWei(count) {
  return count * 10 ** 18;
}