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

    // Token Distribution
    uint256 private op_percentage;
    uint256 private foundation_percentage;
    uint256 private team_percentage;
    uint256 private mining_percentage;
    uint256 private vote_percentage;

    // Token Address
    address private op_address;
    address private foundation_address;
    address private team_address;
    address private c_address;
    address private pool_address;
    address private b_address;

    event Revenue(uint256 difficulty, uint256 revenue, uint256 alpha, uint256 total_mined, uint256 time);

    function initialize(
        string memory _name, string memory _symbol, uint8 _decimals, uint256 _cap, address _op_address, address _foundation_address, address _team_address, address _c_address, address _pool_address, address _b_address, address _owner_address
    ) public initializer {
        require(_cap > 0);
        require(_owner_address != address(0));
        Ownable.initialize(_owner_address);
        Whitelisted.initialize(_owner_address);
        
        total_revenue         = 0;        
        op_percentage         = 37;  // 3.7%
        foundation_percentage = 100; // 10%
        team_percentage       = 150; // 15%
        mining_percentage     = 700; // 70%
        vote_percentage       = 13;  // %1.3

        ERC20Capped.initialize(_cap, _owner_address);
        ERC20Pausable.initialize(_owner_address);
        ERC20Detailed.initialize(_name, _symbol, _decimals);
        
        op_address = _op_address;
        foundation_address = _foundation_address;
        team_address = _team_address;
        c_address = _c_address;
        pool_address = _pool_address;
        b_address = _b_address;

        _mint(op_address, _cap.mul(op_percentage).div(1000));
        _mint(foundation_address, _cap.mul(foundation_percentage).div(1000));
    }


    function version() public pure returns (string memory) {
        string memory ver = "v0";
        return ver;
    }


    function revenue() public view returns (uint256) {
        return total_revenue;
    }


    /**
     * @dev Mined by revenue
     * @param _difficulty Difficulty of the mining period (*10^decimals)
     * @param _revenue Today's USD Revenue (*10^decimals)
     * @param _alpha Percentage of user's contribution, [0, 1] (*10^decimals)
     */
    function mine(uint256 _difficulty, uint256 _revenue, uint256 _alpha)
    public onlyWhitelisted returns (uint256) {
        require(_revenue > _difficulty);
        require(_difficulty > 0);
        require(_alpha > 0);

        uint256 precision = 10 ** uint256(decimals());
        total_revenue = total_revenue.add(_revenue);

        uint256 total_community_invest = _revenue.mul(precision).div(_difficulty);

        uint256 total_pool = total_community_invest.mul(8).div(100);
        uint256 total_sku = total_community_invest.sub(total_pool);

        _mint(pool_address, total_pool);
        uint256 total_sku_user = total_sku.mul(_alpha).div(precision);
        // _mint(c_address, total_sku_user);
        uint256 total_sku_project = total_sku.sub(total_sku_user);
        _mint(b_address, total_sku_project);

        uint256 total_community_vote = total_community_invest.div(10);
        _mint(c_address, total_community_vote.add(total_sku_user));

        uint256 total_team = total_community_invest.mul(team_percentage).div(mining_percentage);
        _mint(team_address, total_team);

        uint256 total_mined = total_community_invest.add(total_community_vote).add(total_team);
        emit Revenue(_difficulty, _revenue, _alpha, total_mined, now);

        return total_mined;
    }
}