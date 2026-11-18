
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MALLAHNFT is ERC721, Ownable {

    uint256 public nextTokenId = 1;

    constructor(
        string memory nftName,
        string memory nftSymbol,
        address initialOwner
    )
        ERC721(nftName, nftSymbol)
        Ownable(initialOwner)
    {
        require(bytes(nftName).length > 0, "Empty NFT name");
        require(bytes(nftSymbol).length > 0, "Empty NFT symbol");
    }

    function mintNFT(address to)
        external
        onlyOwner
        returns (uint256)
    {
        require(to != address(0), "Invalid recipient");

        uint256 newTokenId = nextTokenId;
        nextTokenId++;

        _safeMint(to, newTokenId);

        return newTokenId;
    }
}
