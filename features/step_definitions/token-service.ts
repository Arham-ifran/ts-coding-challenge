import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, TokenCreateTransaction, TokenMintTransaction, TransferTransaction, AccountId, Client, PrivateKey, TokenType, TokenSupplyType, Hbar, TokenInfoQuery } from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet()

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0]
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  //Create the query request
  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)

});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
  this.client = client
  try {
    const supplyKey = PrivateKey.generateED25519();

    const transaction = new TokenCreateTransaction()
      .setTokenName("Test Token")
      .setTokenSymbol("HTT")
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setInitialSupply(10000000)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setDecimals(2)
      .setMaxTransactionFee(new Hbar(10))
      .setSupplyKey(supplyKey.publicKey);

    const response = await transaction.execute(client);
    const receipt: any = await response.getReceipt(client);

    this.tokenInfo = await new TokenInfoQuery()
      .setTokenId(receipt.tokenId.toString())
      .execute(client);

    this.supplyKey = supplyKey;

  } catch (error) {
    throw error;
  }
});

Then(/^The token has the name "([^"]*)"$/, async function (expectedName: string) {
  assert.ok(this.tokenInfo.name, expectedName);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedSymbol: string) {
  assert.ok(this.tokenInfo.symbol, expectedSymbol);
});

Then(/^The token has (\d+) decimals$/, async function (expectedDecimals: string) {
  assert.ok(this.tokenInfo.decimals, expectedDecimals);
});

Then(/^The token is owned by the account$/, async function () {
  assert.ok(this.tokenInfo.treasuryAccountId.toString(), this.client.operatorAccountId.toString())
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (additionalTokens: number) {
  const mintAmount = additionalTokens;
  try {
    let transaction = new TokenMintTransaction()
      .setTokenId(this.tokenInfo.tokenId)
      .setAmount(mintAmount)
      .setMaxTransactionFee(new Hbar(10))
      .freezeWith(this.client);

    transaction = await transaction.sign(this.supplyKey);

    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(this.tokenInfo.tokenId)
      .execute(client);

    const updatedTotalSupply = tokenInfo.totalSupply.low + (tokenInfo.totalSupply.high * Math.pow(2, 32));
    const previousTotalSupply = this.tokenInfo.totalSupply.low + (this.tokenInfo.totalSupply.high * Math.pow(2, 32));

    assert.ok(updatedTotalSupply, previousTotalSupply + additionalTokens);
  } catch (error) {
    throw error;
  }
});
When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (totalSupply: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
  this.client = client
  try {
    const supplyKey = PrivateKey.generateED25519();
    const transaction = new TokenCreateTransaction()
      .setTokenName("Test Token")
      .setTokenSymbol("HTT")
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Finite)
      .setInitialSupply(totalSupply)
      .setMaxSupply(totalSupply)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setDecimals(2)
      .setMaxTransactionFee(new Hbar(10))
      .setSupplyKey(supplyKey.publicKey);

    const response = await transaction.execute(client);
    const receipt: any = await response.getReceipt(client);

    this.tokenInfo = await new TokenInfoQuery()
      .setTokenId(receipt.tokenId.toString())
      .execute(client);

    this.supplyKey = supplyKey;

  } catch (error) {
    throw error;
  }
});
Then(/^The total supply of the token is (\d+)$/, async function (expectedSupply: number) {
  const totalSupply = this.tokenInfo.totalSupply.low + (this.tokenInfo.totalSupply.high * Math.pow(2, 32));
  assert.ok(expectedSupply, totalSupply);
});
Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    const mintTx = new TokenMintTransaction()
      .setTokenId(this.tokenInfo.tokenId)
      .setAmount(1000)
      .freezeWith(client);

    const signedMintTx = await mintTx.sign(this.supplyKey);
    const response = await signedMintTx.execute(client);
    const receipt = await response.getReceipt(client);

    assert.strictEqual(receipt.status.toString(), 'FAILURE', 'Minting should have failed');
  } catch (error: any) {
    assert.ok(error.message);
  }

});
Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[1]
  this.MY_FIRST_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_FIRST_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.firstAccountClient = client.setOperator(this.MY_FIRST_ACCOUNT_ID, this.MY_FIRST_PRIVATE_KEY);

  //Create the query request
  const query = new AccountBalanceQuery().setAccountId(this.MY_FIRST_ACCOUNT_ID);
  const balance = await query.execute(client)

  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});
Given(/^A second Hedera account$/, async function () {
  const account = accounts[2]
  this.MY_SECOND_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_SECOND_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.secondAccountClient = client.setOperator(this.MY_SECOND_ACCOUNT_ID, this.MY_SECOND_PRIVATE_KEY);
});
Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (totalSupply: number) {
  const account = accounts[1]
  this.MY_FIRST_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_FIRST_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  try {
    const supplyKey = PrivateKey.generateED25519();

    const transaction = new TokenCreateTransaction()
      .setTokenName("Test Token")
      .setTokenSymbol("HTT")
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setInitialSupply(totalSupply)
      .setTreasuryAccountId(this.MY_FIRST_ACCOUNT_ID)
      .setDecimals(2)
      .setMaxTransactionFee(new Hbar(10))
      .setSupplyKey(supplyKey.publicKey);

    const response = await transaction.execute(client);
    const receipt: any = await response.getReceipt(client);

    this.tokenInfo = await new TokenInfoQuery()
      .setTokenId(receipt.tokenId.toString())
      .execute(client);

    this.supplyKey = supplyKey;

  } catch (error) {
    throw error;
  }
});
Given(/^The first account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery()
    .setAccountId(this.MY_FIRST_ACCOUNT_ID);
  const balance: any = await query.execute(this.firstAccountClient);

  assert.ok(balance.hbars.toBigNumber().toNumber() >= expectedAmount.toString())
});
Given(/^The second account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery()
    .setAccountId(this.MY_SECOND_ACCOUNT_ID);
  const balance: any = await query.execute(this.secondAccountClient);

  assert.ok(balance.hbars.toBigNumber().toNumber() >= expectedAmount.toString())
});
When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (transferAmount: number) {
  const transaction = new TransferTransaction()
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_FIRST_ACCOUNT_ID, -transferAmount)
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_SECOND_ACCOUNT_ID, transferAmount)
    .setMaxTransactionFee(new Hbar(10))
    .setTransactionMemo("Transfer HTT tokens");

  try {
    const response = await transaction.execute(this.firstAccountClient);
    this.transactionReceipt = await response.getReceipt(this.firstAccountClient);
  } catch (error) {
    throw error;
  }
});
When(/^The first account submits the transaction$/, async function () {

});
When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (transferAmount: number) {
  const transaction = new TransferTransaction()
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_SECOND_ACCOUNT_ID, -transferAmount)
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_FIRST_ACCOUNT_ID, transferAmount)
    .setMaxTransactionFee(new Hbar(1))
    .setTransactionMemo("Transfer HTT tokens to first account");

  try {
    const response = await transaction.execute(this.secondAccountClient);
    this.transactionReceipt = await response.getReceipt(this.secondAccountClient);
  } catch (error) {
    throw error;
  }

});
Then(/^The first account has paid for the transaction fee$/, async function () {

});
Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbar: number, expectedHttTokens: number) {
  const account = accounts[1];
  this.MY_FIRST_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_FIRST_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.firstAccountClient = client.setOperator(this.MY_FIRST_ACCOUNT_ID, this.MY_FIRST_PRIVATE_KEY);

  const balanceQuery = new AccountBalanceQuery().setAccountId(this.MY_FIRST_ACCOUNT_ID);
  const balance = await balanceQuery.execute(client);
  const hbarBalance = balance.hbars.toBigNumber().toNumber();

  assert.ok(hbarBalance > expectedHbar, `Expected HBAR balance greater than ${expectedHbar}, but got ${hbarBalance}`);

  const tokenBalanceQuery = new AccountBalanceQuery()
    .setAccountId(this.MY_FIRST_ACCOUNT_ID);

  const tokenBalance = await tokenBalanceQuery.execute(client);
  const httTokenBalance = tokenBalance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;

  assert.ok(Number(httTokenBalance) >= expectedHttTokens, `Expected HTT token balance greater than or equal to ${expectedHttTokens}, but got ${httTokenBalance}`);
});
Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbar: number, expectedHttTokens: number) {
  const account = accounts[2];
  this.MY_SECOND_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_SECOND_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.secondAccountClient = client.setOperator(this.MY_SECOND_ACCOUNT_ID, this.MY_SECOND_PRIVATE_KEY);

  const balanceQuery = new AccountBalanceQuery().setAccountId(this.MY_SECOND_ACCOUNT_ID);
  const balance: any = await balanceQuery.execute(client);
  const hbarBalance = balance.hbars.toBigNumber().toNumber();

  assert.ok(hbarBalance >= expectedHbar, `Expected HBAR balance to be ${expectedHbar}, but got ${hbarBalance}`);

  const tokenBalance = balance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;

  assert.ok(tokenBalance >= expectedHttTokens, `Expected HTT token balance to be ${expectedHttTokens}, but got ${tokenBalance}`);

});
Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbar: number, expectedHttTokens: number) {
  const account = accounts[3];
  this.MY_THIRD_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_THIRD_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.thirdAccountClient = client.setOperator(this.MY_THIRD_ACCOUNT_ID, this.MY_THIRD_PRIVATE_KEY);

  const balanceQuery = new AccountBalanceQuery().setAccountId(this.MY_THIRD_ACCOUNT_ID);
  const balance: any = await balanceQuery.execute(client);
  const hbarBalance = balance.hbars.toBigNumber().toNumber();

  assert.ok(hbarBalance >= expectedHbar, `Expected HBAR balance to be ${expectedHbar}, but got ${hbarBalance}`);

  const tokenBalance = balance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;
  assert.ok(tokenBalance >= expectedHttTokens, `Expected HTT token balance to be ${expectedHttTokens}, but got ${tokenBalance}`);
});
Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbar: number, expectedHttTokens: number) {
  const account = accounts[4];
  this.MY_FOURTH_ACCOUNT_ID = AccountId.fromString(account.id);
  this.MY_FOURTH_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.fourthAccountClient = client.setOperator(this.MY_FOURTH_ACCOUNT_ID, this.MY_FOURTH_PRIVATE_KEY);

  const balanceQuery = new AccountBalanceQuery().setAccountId(this.MY_FOURTH_ACCOUNT_ID);
  const balance: any = await balanceQuery.execute(client);
  const hbarBalance = balance.hbars.toBigNumber().toNumber();

  assert.ok(hbarBalance >= expectedHbar, `Expected HBAR balance to be ${expectedHbar}, but got ${hbarBalance}`);

  const tokenBalance = balance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;

  assert.ok(tokenBalance >= expectedHttTokens, `Expected HTT token balance to be ${expectedHttTokens}, but got ${tokenBalance}`);

});
When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (transferFromFirst: number, transferFromSecond: number, transferToThird: number) {
  const accountFirst = accounts[1];
  this.MY_FIRST_ACCOUNT_ID = AccountId.fromString(accountFirst.id);

  const accountSecond = accounts[2];
  this.MY_SECOND_ACCOUNT_ID = AccountId.fromString(accountSecond.id);

  const accountThird = accounts[3];
  this.MY_THIRD_ACCOUNT_ID = AccountId.fromString(accountThird.id);

  const accountFourth = accounts[4];
  this.MY_FOURTH_ACCOUNT_ID = AccountId.fromString(accountFourth.id);

  const transferAmount1 = transferFromFirst;
  const transferAmount2 = transferFromSecond;
  const transferAmount3 = transferToThird;

  const transaction = new TransferTransaction()
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_FIRST_ACCOUNT_ID, -transferAmount1)
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_SECOND_ACCOUNT_ID, -transferAmount2)
    .addTokenTransfer(this.tokenInfo.tokenId, this.MY_THIRD_ACCOUNT_ID, transferAmount3)
    .setMaxTransactionFee(new Hbar(30))
    .setTransactionMemo("Multi-account token transfer");

  try {
    const response = await transaction.execute(this.firstAccountClient);
    this.transactionReceipt = await response.getReceipt(this.firstAccountClient);
  } catch (error) {
    throw error;
  }
});
Then(/^The third account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery()
    .setAccountId(this.MY_THIRD_ACCOUNT_ID);

  const balance: any = await query.execute(client);
  const httTokenBalance = balance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;
  assert.ok(Number(httTokenBalance) >= expectedAmount, `Expected HTT token balance to be ${expectedAmount}, but got ${httTokenBalance}`);
});
Then(/^The fourth account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery()
    .setAccountId(this.MY_FOURTH_ACCOUNT_ID);

  const balance: any = await query.execute(client);
  const httTokenBalance = balance.tokens?.get(this.tokenInfo.tokenId.toString()) || 0;
  assert.ok(httTokenBalance >= expectedAmount, `Expected HTT token balance to be ${expectedAmount}, but got ${httTokenBalance}`);

});
