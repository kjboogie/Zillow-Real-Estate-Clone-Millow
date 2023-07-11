//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {

    //state variables
    address public nftAddress;
    address payable public seller;
    address public lender;
    address public inspector;

    //modifiers
    modifier onlyBuyer(uint256 _nftID){
        require(msg.sender == buyer[_nftID], "Only buyer can call this method");
        _;
    }
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call ths method");
        _;
    }
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only seller can call ths method");
        _;
    }


    //mappings
    mapping(uint256 => bool) public isListed;  // here uint256 is for nftID and bool is true/false
    mapping(uint256 => uint256) public purchasePrice; // here uint256 is for nftID and price of that nft
    mapping(uint256 => uint256) public escrowAmount;  // here uint256 is for nftID and
    mapping(uint256 => address) public buyer; // here uint256 is for nftID and buyer address
    mapping(uint256 => bool) public inspectionPassed; // mapping to check if inspection is passed for the NFT/property or not
    mapping(uint256 => mapping(address => bool)) public approval;  //mapping to check if the person approved or not. NftID => <address of the approval person> => true/false

    constructor(address _nftAddress, address payable _seller, address _inspector, address _lender){
        nftAddress = _nftAddress;
        seller = _seller;
        lender = _lender;
        inspector = _inspector;
    }


    //Listing property
    function list(uint256 _nftID, address _buyer, uint256 _purchasePrice,uint256 _escrowAmount ) public payable onlySeller {
        //Transfer NFT from seller to this contract
        IERC721(nftAddress).transferFrom(msg.sender,address(this), _nftID);

        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
    }


    //put under contract (only buyer - payable escrow)
    function depositEarnest(uint _nftID) public payable onlyBuyer(_nftID) {
        require(msg.value >= escrowAmount[_nftID]);

    }

    //Udpate the Inspection Status (only inspector)
    function updateInspectionStatus(uint256 _nftID,bool _passed) public onlyInspector{
        inspectionPassed[_nftID] = _passed;
    }

    //approval sale
    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    //Finalise Started Code
    //-> Require inspection status
    //-> Require sale to be authorised
    //-> Require funds to be correct amount
    //-> Transfer NFT to buyer
    //-> Transfer funds to seller from the escrow contract
    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID] );                   //-> Require inspection status 
        require(approval[_nftID][buyer[_nftID]]);                    //-> Require sale to be authorised
        require(approval[_nftID][seller]);                           //-> Require sale to be authorised
        require(approval[_nftID][lender]);                           //-> Require sale to be authorised
        require(address(this).balance >= purchasePrice[_nftID] );    //-> Require funds to be correct amount

        isListed[_nftID] = false;                                    // -> taking off NFT/property from listing

        (bool success, ) = payable(seller).call{value: address(this).balance}("");  //-> Transfer funds to seller from the escrow contract
        require(success);

        IERC721(nftAddress).transferFrom(address(this),buyer[_nftID], _nftID);      //-> Transfer NFT to buyer

    }

    //Cancel Sale (handle earnest deposit)
    // -> if inspection status is not approved, then refund, otherwise send to seller
    function cancelSale(uint256 _nftID) public {
        if(inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        }
        else{
            payable(seller).transfer(address(this).balance);
        }
    }

    //receive function of the contract. Without this, a contract cannot receive ethers from external wallet.
    receive() external payable {}




    //getting current balance of the contract
    function getBalance() public view returns(uint256){
        return address(this).balance;
    }
}
