
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {MALLAHNFT} from "./MALLAHNFT.sol";

contract TokenToNFT is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;

    MALLAHNFT public immutable nftContract;

    uint256 public immutable nftPrice;

    event NFTPurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 amountPaid
    );

    event TokensWithdrawn(
        address indexed owner,
        uint256 amount
    );

    constructor(
        address tokenAddress,
        address nftAddress,
        uint256 price,
        address initialOwner
    )
        Ownable(initialOwner)
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(nftAddress != address(0), "Invalid NFT address");
        require(price > 0, "Price must be greater than zero");

        paymentToken = IERC20(tokenAddress);
        nftContract = MALLAHNFT(nftAddress);
        nftPrice = price;
    }

    function buyNFT() external nonReentrant {

        paymentToken.safeTransferFrom(
            msg.sender,
            address(this),
            nftPrice
        );

        uint256 newTokenId = nftContract.mintNFT(msg.sender);

        emit NFTPurchased(
            msg.sender,
            newTokenId,
            nftPrice
        );
    }

    function withdrawTokens(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        paymentToken.safeTransfer(owner(), amount);

        emit TokensWithdrawn(owner(), amount);
    }
}
