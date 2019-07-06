pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Capped.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./Whitelisted.sol";


contract AxonToken is Initializable, ERC20Capped, ERC20Pausable, ERC20Detailed, Ownable, Whitelisted {
    // Run paras
    uint256 private total_revenue;
    uint256 private total_invest_mined;
    uint256 private total_community_vote_amount;
    uint256[] public difficulty_list;
    uint256 public current_difficulty;
    uint256 private staking_mine_rate;

    // Token Distribution and Pool Address
    // op_percentage               : 3.7%
    // foundation_percentage       : 10%
    // team_percentage             : 15%
    // mining_percentage           : 70%
    // vote_percentage             : 1.3%
    address private op_address;
    address private foundation_address;
    address private team_address;
    address private c_address;
    address private pool_address;
    address private b_address;
    struct AddressPool {
        address op_address;
        address foundation_address;
        address team_address;
        address c_address;
        address pool_address;
        address b_address;
    };
    AddressPool private address_pool;


    // Event
    event LogRevenue(uint256 difficulty, uint256 revenue, uint256 alpha, uint256 total_mined, uint256 invest_mined);
    event LogStaking(uint256 difficulty, uint256 revenue, uint256 alpha, uint256 staking_mined);
    event LogTokenMultiSent(address indexed sender, uint256 total);
    event LogSendToken(address indexed sender, address indexed receiver, uint256 amount, bool result);


    function initialize(
        string memory _name, string memory _symbol, uint8 _decimals, uint256 _cap, address _op_address, address _foundation_address, address _team_address, address _c_address, address _pool_address, address _b_address, address _owner_address
    ) public initializer {
        require(_cap > 0);
        require(_owner_address != address(0));
        Ownable.initialize(_owner_address);
        Whitelisted.initialize(_owner_address);

        total_community_vote_amount = 0;
        total_invest_mined          = 0;
        total_revenue               = 0;
        current_difficulty          = 0;
        staking_mine_rate           = 0;

        ERC20Capped.initialize(_cap, _owner_address);
        ERC20Pausable.initialize(_owner_address);
        ERC20Detailed.initialize(_name, _symbol, _decimals);
        
        op_address = _op_address;
        foundation_address = _foundation_address;
        team_address = _team_address;
        c_address = _c_address;
        pool_address = _pool_address;
        b_address = _b_address;

        _mint(op_address, _cap.mul(37).div(1000)); // 3.7%
        _mint(foundation_address, _cap.mul(100).div(1000)); // 10%
    }


    function version() public pure returns (string memory) {
        return "v0";
    }


    function revenue() public view returns (uint256) {
        return total_revenue;
    }


    function invest_mined() public view returns (uint256) {
        return total_invest_mined;
    }


    function get_difficulty_list() public view returns (uint256[] memory) {
        return difficulty_list;
    }


    function get_staking_mine_rate() public view returns (uint256) {
        return staking_mine_rate;
    }

    function set_staking_mine_rate(uint256 _rate) public onlyOwner returns (bool) {
        if (staking_mine_rate != _rate) {
            staking_mine_rate = _rate;
            return true;
        }
        return false;
    }

    /**
     * @dev Mined by revenue
     * @param _difficulty Difficulty of the mining period (*10^decimals)
     * @param _revenue Revenue (*10^decimals)
     * @param _alpha Percentage of user's contribution, [0, 1] (*10^decimals)
     * @param _staking_cnt Staking count from users, [0, total_supply] (*10^decimals)
     */
    function mine(uint256 _difficulty, uint256 _revenue, uint256 _alpha, uint256 _staking_cnt)
    public onlyWhitelisted returns (uint256) {
        // uint256 precision = 10 ** uint256(decimals());
        require(_difficulty > 0);
        require(_revenue > _difficulty);
        require(_staking_cnt >= 0);
        require(_alpha >= 0);
        require(_difficulty >= current_difficulty);

        if (current_difficulty != _difficulty) {
            difficulty_list.push(_difficulty);
        }
        current_difficulty = _difficulty;
        total_revenue = total_revenue.add(_revenue);

        // Mined by investing
        uint256 total_community_invest = _revenue.mul(10 ** uint256(decimals())).div(_difficulty);
        // Mined by staking
        if (_staking_cnt > 0 && staking_mine_rate > 0) {
            if (_staking_cnt >= total_community_invest.mul(2).mul(10 ** uint256(decimals())).div(staking_mine_rate)) {
                emit LogStaking(_difficulty, _revenue, _alpha, total_community_invest.mul(2));
                total_community_invest = total_community_invest.mul(3);
            }
        }
        total_invest_mined = total_invest_mined.add(total_community_invest);

        // Unlock 15%
        if (total_community_invest.mul(15).div(70) > 0) {
            _mint(team_address, total_community_invest.mul(15).div(70));
        }

        // Mine 70%
        // To pool
        if (total_community_invest.mul(8).div(100) > 0) {
            _mint(pool_address, total_community_invest.mul(8).div(100));
        }
        // To C
        uint256 total_sku_user = total_community_invest.mul(92).div(100).mul(_alpha).div(10 ** uint256(decimals()));
        // To B
        if (total_community_invest.mul(92).div(100).sub(total_sku_user) > 0) {
            _mint(b_address, total_community_invest.mul(92).div(100).sub(total_sku_user));
        }

        // Unlock 1.3%
        uint256 total_community_vote = total_community_invest.div(10);
        if (total_community_vote >= cap().mul(13).div(1000).sub(total_community_vote_amount)) { // 1.3%
            total_community_vote = cap().mul(13).div(1000).sub(total_community_vote_amount);
            total_community_vote_amount = cap().mul(13).div(1000);
        } else {
            total_community_vote_amount = total_community_vote.add(total_community_vote_amount);
        }
        if (total_community_vote.add(total_sku_user) > 0) {
            _mint(c_address, total_community_vote.add(total_sku_user));
        }

        // emit LogRevenue(_difficulty, _revenue, _alpha, total_community_invest.add(total_community_vote).add(total_community_invest.mul(15).div(70)), total_community_invest);
        // return total_community_invest.add(total_community_vote).add(total_community_invest.mul(15).div(70));
    }


    /* 
    function multisend(address[] memory _recipients, uint256[] memory _values)
    public returns (uint256) {
        require(_recipients.length == _values.length);
        require(_recipients.length > 0);
        // require(_recipients.length <= 120);

        uint256 total = 0;
        uint256 i = 0;
        while (i < _recipients.length) {
            if (_recipients[i] == address(0)) {
                i += 1;
                continue;
            }

            bool result = transfer(_recipients[i], uint256(_values[i]));
            emit LogSendToken(msg.sender, _recipients[i], _values[i], result);
            if (result == false) { break; }
            total = total.add(uint256(_values[i]));
            i += 1;
        }
        emit LogTokenMultiSent(msg.sender, total);
        return i;
    }


    function axonburn(uint256 value) public returns (bool) {
        require(value > 0);
        return transfer(address(0), value);
    }
    */
}