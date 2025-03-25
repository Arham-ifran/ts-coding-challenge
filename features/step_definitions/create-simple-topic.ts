import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
  PublicKey,
  KeyList,
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
// Pre-configured client for test network (testnet)
const client = Client.forTestnet();

Given('a first account with more than {int} hbars', async function (expectedBalance: number) {
  const acc = accounts[0]
  const account: AccountId = AccountId.fromString(acc.id);
  this.account = account
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey = privKey
  client.setOperator(this.account, privKey);

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});

Given('A second account with more than {int} hbars', async function (expectedBalance: number) {
  const acc = accounts[1];
  const account: AccountId = AccountId.fromString(acc.id);
  this.secondAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.secondPrivKey = privKey;
  client.setOperator(this.secondAccount, privKey);

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

Given('A {int} of {int} threshold key with the first and second account', async function (requiredSignatures: number, totalSignatures: number) {
  const publicKey1 = PublicKey.fromString(accounts[0].publicKey);
  const publicKey2 = PublicKey.fromString(accounts[1].publicKey);
  const keyList = new KeyList([publicKey1, publicKey2], requiredSignatures);
  this.thresholdKey = keyList;
});

When('A topic is created with the memo {string} with the first account as the submit key', async function (memo: string) {
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.privKey.publicKey)
    .setAdminKey(this.privKey.publicKey)
    .setMaxTransactionFee(new Hbar(10));
  const response = await transaction.execute(client);
  const receipt: any = await response.getReceipt(client);
  assert.equal(receipt.status.toString(), "SUCCESS");
  this.topicId = receipt.topicId.toString();
});

When('A topic is created with the memo {string} with the threshold key as the submit key', async function (memo: string) {
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.thresholdKey)
    .setAdminKey(this.privKey.publicKey)
    .setMaxTransactionFee(new Hbar(10));
  const response = await transaction.execute(client);
  const receipt: any = await response.getReceipt(client);
  assert.equal(receipt.status.toString(), "SUCCESS");
  this.topicId = receipt.topicId.toString();
});

When('The message {string} is published to the topic', async function (message: string) {
  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message)
    .setMaxTransactionFee(new Hbar(1));
  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);
  this.message = message
  assert.equal(receipt.status.toString(), "SUCCESS");
});

Then('The message {string} is received by the topic and can be printed to the console', async function (expectedMessage: string) {
  assert.ok(this.message, expectedMessage);
});
