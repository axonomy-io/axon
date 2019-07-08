pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Capped.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "./Whitelisted.sol";


contract AxonToken is Initializable, ERC20Capped, ERC20Pausable, ERC20Detailed, ERC20Burnable, Ownable, Whitelisted {
    // Run paras
    // 0 total_vote_amount
    // 1 total_invest_mined
    // 2 total_revenue
    // 3 current_difficulty
    // 4 staking_mine_rate
    uint256[] private setting;
    uint256[] private difficulty_list;

    // Token Distribution and Pool Address
    // op_percentage               : 3.7%
    // foundation_percentage       : 10%
    // team_percentage             : 15%
    // mining_percentage           : 70%
    // vote_percentage             : 1.3%
    // 0 op_address;
    // 1 foundation_address;
    // 2 team_address;
    // 3 c_address;
    // 4 pool_address;
    // 5 b_address;
    address[] private address_pool;

    // Event
    event LogRevenue(uint256 difficulty, uint256 revenue, uint256 alpha, uint256 total_mined);
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
        ERC20Capped.initialize(_cap, _owner_address);
        ERC20Pausable.initialize(_owner_address);
        ERC20Detailed.initialize(_name, _symbol, _decimals);

        setting.push(0);
        setting.push(0);
        setting.push(0);
        setting.push(0);
        setting.push(0);

        address_pool.push(_op_address);
        address_pool.push(_foundation_address);
        address_pool.push(_team_address);
        address_pool.push(_c_address);
        address_pool.push(_pool_address);
        address_pool.push(_b_address);

        _mint(address_pool[0], _cap.mul(37).div(1000));  // 3.7%
        _mint(address_pool[1], _cap.mul(100).div(1000)); // 10%
    }

    function version() public pure returns (string memory) {
        return "v0";
    }

    function get_revenue() public view returns (uint256) {
        return setting[2];
    }

    function get_invest_mined() public view returns (uint256) {
        return setting[1];
    }

    function get_address_pool() public view returns (address[] memory) {
        return address_pool;
    }

    function get_setting() public view returns (uint256[] memory) {
        return setting;
    }

    function get_difficulty_list() public view returns (uint256[] memory) {
        return difficulty_list;
    }

    function get_staking_mine_rate() public view returns (uint256) {
        return setting[4];
    }

    function set_staking_mine_rate(uint256 _rate) public onlyOwner returns (bool) {
        if (setting[4] != _rate) {
            setting[4] = _rate;
            return true;
        }
        return false;
    }

    function get_current_difficulty() public view returns (uint256) {
        return setting[3];
    }

    function set_current_difficulty(uint256 _difficulty) public onlyOwner returns (bool) {
        if (setting[3] != _difficulty) {
            setting[3] = _difficulty;
            return true;
        }
        return false;
    }

    /**
     * @dev Mined by revenue and boost by staking
     * paras[0] _difficulty Difficulty of the mining period (*10^decimals)
     * paras[1] _revenue Revenue (*10^decimals)
     * paras[2] _alpha Percentage of user's contribution, [0, 1] (*10^decimals)
     * paras[3] _staking_cnt Staking count from users, [0, total_supply] (*10^decimals)
     */
    function mine(uint256[] memory paras) public onlyWhitelisted returns (uint256) {
        uint256 precision = 10 ** uint256(decimals());
        require(paras.length == 4);
        require(paras[0] >= setting[3]);
        require(paras[0] > 0);
        require(paras[1] > paras[0]);
        require(paras[3] >= 0);
        require(paras[2] >= 0);

        if (setting[3] != paras[0]) {
            difficulty_list.push(paras[0]);
        }
        setting[3] = paras[0];
        setting[2] = setting[2].add(paras[1]);

        // Mined by investing
        uint256 total_mined = paras[1].mul(precision).div(paras[0]);
        // Boost by staking
        if (paras[3] > 0 && setting[4] > 0) {
            if (paras[3] >= total_mined.mul(2).mul(precision).div(setting[4])) {
                emit LogStaking(paras[0], paras[1], paras[2], total_mined.mul(2));
                total_mined = total_mined.mul(3);
            }
        }
        setting[1] = setting[1].add(total_mined);

        // Unlock 15%
        if (total_mined.mul(15).div(70) > 0) {
            _mint(address_pool[2], total_mined.mul(15).div(70));
        }

        // Mine 70%
        // To pool
        if (total_mined.mul(8).div(100) > 0) {
            _mint(address_pool[4], total_mined.mul(8).div(100));
        }
        // To C
        uint256 total_sku_user = total_mined.mul(92).div(100).mul(paras[2]).div(precision);
        // To B
        if (total_mined.mul(92).div(100).sub(total_sku_user) > 0) {
            _mint(address_pool[5], total_mined.mul(92).div(100).sub(total_sku_user));
        }

        // Unlock 1.3%
        uint256 total_vote = total_mined.div(10);
        if (total_vote >= cap().mul(13).div(1000).sub(setting[0])) { // 1.3%
            total_vote = cap().mul(13).div(1000).sub(setting[0]);
            setting[0] = cap().mul(13).div(1000);
        } else {
            setting[0] = total_vote.add(setting[0]);
        }
        if (total_vote.add(total_sku_user) > 0) {
            _mint(address_pool[3], total_vote.add(total_sku_user));
        }

        emit LogRevenue(paras[0], paras[1], paras[2], total_mined.add(total_vote).add(total_mined.mul(15).div(70)));
        return total_mined.add(total_vote).add(total_mined.mul(15).div(70));
    }

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
}