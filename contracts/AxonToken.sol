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

    // Event
    event LogRevenue(uint256 difficulty, uint256 revenue, uint256 alpha, uint256 total_mined, uint256 invest_mined);
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
        string memory ver = "v0";
        return ver;
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


    /**
     * @dev Mined by revenue
     * @param _difficulty Difficulty of the mining period (*10^decimals)
     * @param _revenue Revenue (*10^decimals)
     * @param _alpha Percentage of user's contribution, [0, 1] (*10^decimals)
     */
    function mine(uint256 _difficulty, uint256 _revenue, uint256 _alpha)
    public onlyWhitelisted returns (uint256) {
        require(_alpha >= 0);
        require(_revenue > _difficulty);
        require(_difficulty >= current_difficulty);

        if (current_difficulty != _difficulty) {
            difficulty_list.push(_difficulty);
        }
        current_difficulty = _difficulty;

        uint256 precision = 10 ** uint256(decimals());
        total_revenue = total_revenue.add(_revenue);
        
        uint256 total_community_invest = _revenue.mul(precision).div(_difficulty);
        total_invest_mined = total_invest_mined.add(total_community_invest);

        uint256 total_pool = total_community_invest.mul(8).div(100);
        uint256 total_sku = total_community_invest.sub(total_pool);

        if (total_pool > 0) { _mint(pool_address, total_pool); }
        uint256 total_sku_user = total_sku.mul(_alpha).div(precision);
        // _mint(c_address, total_sku_user);
        uint256 total_sku_project = total_sku.sub(total_sku_user);
        if (total_sku_project > 0) { _mint(b_address, total_sku_project); }

        uint256 total_community_vote = total_community_invest.div(10);
        uint256 next = total_community_vote_amount.add(total_community_vote);
        if (next <= cap().mul(13).div(1000)) {
            total_community_vote_amount = next;
        } else {
            total_community_vote = 0;
        }
        uint256 c_amount = total_community_vote.add(total_sku_user);
        if (c_amount > 0) { _mint(c_address, c_amount); }

        uint256 total_team = total_community_invest.mul(15).div(70);
        if (total_team > 0) { _mint(team_address, total_team); }

        uint256 total_mined = total_community_invest.add(total_community_vote).add(total_team);
        emit LogRevenue(_difficulty, _revenue, _alpha, total_mined, total_community_invest);

        return total_mined;
    }


    function multisend(address[] memory _recipients, uint256[] memory _values)
    public returns (uint256) {
        require(_recipients.length == _values.length);
        require(_recipients.length > 0);
        // require(_recipients.length <= 120);

        uint256 total = 0;
        uint256 i = 0;
        while (i < _recipients.length) {
            if (_recipients[i] == address(0)) continue;

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
}