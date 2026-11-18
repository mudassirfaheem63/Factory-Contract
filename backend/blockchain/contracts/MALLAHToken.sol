
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MALLAHToken is ERC20, Ownable {

    uint8 private immutable _customDecimals;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 initialSupply,
        address initialOwner
    )
        ERC20(tokenName, tokenSymbol)
        Ownable(initialOwner)
    {
        require(bytes(tokenName).length > 0, "Empty token name");
        require(bytes(tokenSymbol).length > 0, "Empty token symbol");
        require(tokenDecimals <= 18, "Decimals maximum is 18");
        require(initialSupply > 0, "Supply must be greater than zero");

        _customDecimals = tokenDecimals;

        uint256 multiplier = 10 ** uint256(tokenDecimals);

        _mint(initialOwner, initialSupply * multiplier);
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }
}
