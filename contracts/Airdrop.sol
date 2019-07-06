pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "./Whitelisted.sol";


contract Airdrop is Initializable, Ownable, Whitelisted {
    using SafeMath for uint256;

    event LogTokenMultiSent(address indexed token, uint256 total);
    event LogSendToken(address indexed token, address indexed receiver, uint256 amount, bool result);

    function initialize(
        address _owner_address
    ) public initializer {
        require(_owner_address != address(0));
        Ownable.initialize(_owner_address);
        Whitelisted.initialize(_owner_address);
    }

    function version() public pure returns (string memory) {
        string memory ver = "v0";
        return ver;
    }

    function multisend(address _token_address, address[] memory _recipients, uint256[] memory _values)
    public onlyWhitelisted returns (uint256) {
        require(_token_address != address(0));
        require(_recipients.length == _values.length);
        require(_recipients.length > 0);
        require(_recipients.length <= 120);

        ERC20 token = ERC20(_token_address);
        uint256 total = 0;
        uint256 i = 0;
        while (i < _recipients.length) {
            if (_recipients[i] == address(0)) {
                i += 1;
                continue;
            }

            bool result = token.transferFrom(msg.sender, _recipients[i], uint256(_values[i]));
            emit LogSendToken(_token_address, _recipients[i], _values[i], result);
            if (result == false) { break; }
            total = total.add(uint256(_values[i]));
            i += 1;
        }
        emit LogTokenMultiSent(_token_address, total);
        return i;
    }
}