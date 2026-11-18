
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {MALLAHToken} from "./MALLAHToken.sol";
import {MALLAHNFT} from "./MALLAHNFT.sol";
import {TokenToNFT} from "./TokenToNFT.sol";

contract TokenNFTFactory {

    // Every project has its own configuration and addresses.
    struct Project {
        uint256 projectId;

        address creator;

        address tokenAddress;
        address nftAddress;
        address exchangeAddress;

        string tokenName;
        string tokenSymbol;
        uint8 tokenDecimals;
        uint256 initialSupply;

        string nftName;
        string nftSymbol;

        uint256 nftPriceTokens;
        uint256 nftPriceSmallestUnits;

        uint256 createdAt;
    }

    // Project ID starts from 1.
    uint256 public nextProjectId = 1;

    // All projects are stored here.
    mapping(uint256 => Project) private projects;

    // Every creator has their own project IDs.
    mapping(address => uint256[]) private creatorProjects;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed creator,
        address tokenAddress,
        address nftAddress,
        address exchangeAddress
    );

    function createProject(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 initialSupply,
        string memory nftName,
        string memory nftSymbol,
        uint256 nftPriceTokens
    )
        external
        returns (uint256 projectId)
    {
        require(bytes(tokenName).length > 0, "Empty token name");
        require(bytes(tokenSymbol).length > 0, "Empty token symbol");
        require(bytes(nftName).length > 0, "Empty NFT name");
        require(bytes(nftSymbol).length > 0, "Empty NFT symbol");

        require(tokenDecimals <= 18, "Decimals maximum is 18");
        require(initialSupply > 0, "Invalid initial supply");
        require(nftPriceTokens > 0, "Invalid NFT price");

        // Convert whole token price into smallest units.
        uint256 multiplier = 10 ** uint256(tokenDecimals);

        uint256 priceInSmallestUnits =
            nftPriceTokens * multiplier;

        // 1. Deploy ERC20 Token.
        MALLAHToken token = new MALLAHToken(
            tokenName,
            tokenSymbol,
            tokenDecimals,
            initialSupply,
            msg.sender
        );

        // 2. Deploy ERC721 NFT.
        // Initially Factory is the NFT owner.
        MALLAHNFT nft = new MALLAHNFT(
            nftName,
            nftSymbol,
            address(this)
        );

        // 3. Deploy Exchange.
        // Creator becomes the Exchange owner.
        TokenToNFT exchange = new TokenToNFT(
            address(token),
            address(nft),
            priceInSmallestUnits,
            msg.sender
        );

        // 4. Transfer NFT ownership to Exchange.
        nft.transferOwnership(address(exchange));

        // 5. Store all project information.
        projectId = nextProjectId;

        nextProjectId++;

        projects[projectId] = Project({
            projectId: projectId,

            creator: msg.sender,

            tokenAddress: address(token),
            nftAddress: address(nft),
            exchangeAddress: address(exchange),

            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals,
            initialSupply: initialSupply,

            nftName: nftName,
            nftSymbol: nftSymbol,

            nftPriceTokens: nftPriceTokens,
            nftPriceSmallestUnits: priceInSmallestUnits,

            createdAt: block.timestamp
        });

        // 6. Save creator's project ID.
        creatorProjects[msg.sender].push(projectId);

        // 7. Emit deployment event.
        emit ProjectCreated(
            projectId,
            msg.sender,
            address(token),
            address(nft),
            address(exchange)
        );
    }

    // Get complete project information.
    function getProject(uint256 projectId)
        external
        view
        returns (Project memory)
    {
        require(
            projectId > 0 && projectId < nextProjectId,
            "Project does not exist"
        );

        return projects[projectId];
    }

    // Get total number of projects.
    function getProjectCount()
        external
        view
        returns (uint256)
    {
        return nextProjectId - 1;
    }

    // Get a project ID using its zero-based index.
    function getProjectIdAt(uint256 index)
        external
        view
        returns (uint256)
    {
        require(
            index < nextProjectId - 1,
            "Index out of bounds"
        );

        return index + 1;
    }

    // Get all project IDs created by a particular wallet.
    function getCreatorProjects(address creator)
        external
        view
        returns (uint256[] memory)
    {
        return creatorProjects[creator];
    }

    // Get how many projects a creator has deployed.
    function getCreatorProjectCount(address creator)
        external
        view
        returns (uint256)
    {
        return creatorProjects[creator].length;
    }
}
