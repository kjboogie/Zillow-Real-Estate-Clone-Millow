const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {

    let buyer, seller, inspector, lender
    let realEstate,  escrow


beforeEach(async () =>{
 //Setup accounts
 [buyer, seller, inspector, lender] = await ethers.getSigners()
 

 //Deploy RealState Contract
const RealEstate = await ethers.getContractFactory('RealEstate')
realEstate = await RealEstate.deploy()

//Mint
 let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png")
 await transaction.wait()

 //Deploy Escrow Contract
 const Escrow = await ethers.getContractFactory('Escrow')
 escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address)

 //Approve proeprty
 transaction = await realEstate.connect(seller).approve(escrow.address, 1)
 await transaction.wait()

 //List property ----  Function inside escrow contract
 transaction = await escrow.connect(seller).list(1,buyer.address,tokens(10),tokens(5))
 await transaction.wait()

})

describe('Deployment', () => {

    
    it('Returns NFT address', async () => {
        const result = await escrow.nftAddress()
        expect(result).to.be.eq(realEstate.address)
    })

    it('Returns Seller address', async () => {
        const result = await escrow.seller()
        expect(result).to.be.eq(seller.address)
    })

    it('Returns Inspector address', async () => {
        const result = await escrow.inspector()
        expect(result).to.be.eq(inspector.address)
    })

    it('Returns Lender address', async () => {
        const result = await escrow.lender()
        expect(result).to.be.eq(lender.address)
    })

})

describe('Listing', () => {
    
    it('Update isListed mapping', async () => {
        const result = await escrow.isListed(1)
        expect(result).to.be.eq(true)
       
    })

    it('Returns purchasePrice mapping', async () => {
        const result = await escrow.purchasePrice(1)
        expect(result).to.be.eq(tokens(10))
        
    })

    it('Returns escrowAmount mapping', async () => {
        const result = await escrow.escrowAmount(1)
        expect(result).to.be.eq(tokens(5))
        
    })

    it('Returns buyer mapping', async () => {
        const result = await escrow.buyer(1)
        expect(result).to.be.eq(buyer.address)
       
    })

    it('Update the Ownership', async () => {
        expect(await realEstate.ownerOf(1)).to.be.eq(escrow.address)
    })

    


})

describe('Deposits',() => {
   it('Updates contract balance',async() =>{
    const transaction = await escrow.connect(buyer).depositEarnest(1,{value: tokens(5)})
    await transaction.wait()
    const result = await escrow.getBalance()
    expect(result).to.be.equal(tokens(5))
    //console.log(transaction.wait())
   }) 
})

describe('Inspections',() => {
    it('Updates Inspection status',async() =>{
     const transaction = await escrow.connect(inspector).updateInspectionStatus(1,true)
     await transaction.wait()
     const result = await escrow.inspectionPassed(1)
     expect(result).to.be.equal(true)
     //console.log(result.value)
    }) 
 })

 describe('Approval',() => {
    it('Updates Inspection status',async() =>{
     let transaction = await escrow.connect(buyer).approveSale(1)
     await transaction.wait()
    
    transaction = await escrow.connect(seller).approveSale(1)
     await transaction.wait()
     
    transaction = await escrow.connect(lender).approveSale(1)
     await transaction.wait()

     expect(await escrow.approval(1,buyer.address)).to.be.eq(true)
     expect(await escrow.approval(1,seller.address)).to.be.eq(true)
     expect(await escrow.approval(1,lender.address)).to.be.eq(true)
    }) 
 })

 describe('Sale',async () =>{
    beforeEach(async () => {
        let transaction = await escrow.connect(buyer).depositEarnest(1,{value: tokens(5)})
        await transaction.wait()

        transaction = await escrow.connect(inspector).updateInspectionStatus(1,true)
        await transaction.wait()

        transaction = await escrow.connect(buyer).approveSale(1)
        await transaction.wait()
       
        transaction = await escrow.connect(seller).approveSale(1)
        await transaction.wait()
        
        transaction = await escrow.connect(lender).approveSale(1)
        await transaction.wait()

        // Define your transaction parameters
        const transactionParameters = {
            from: lender.address,
            to: escrow.address,
            value: tokens(5),
            gasLimit: ethers.BigNumber.from(50000),
        };

        // Send the transaction
        await lender.sendTransaction({to: escrow.address, value: tokens(5), gasLimit: ethers.BigNumber.from(50000)});

        await escrow.connect(seller).finalizeSale(1)
        await transaction.wait()
    })

    it('update the ownership', async() =>{
        expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
    })

    it('Updates balance', async() =>{
        expect(await escrow.getBalance()).to.be.equals(0)
    })
 })
  
})
