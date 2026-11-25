package tavernwagers

import (
	"chain"
	"testing"
)

func TestPreviewPages(cur realm, t *testing.T) {
	testing.IssueCoins(pkgAddr, chain.Coins{{"ugnot", 100_000_000}})
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(nil)
	tid := CreateTable(cross(cur), "Friday Chess Club", "Alice")
	AddMember(cross(cur), tid, bob, "Bob")
	AddMember(cross(cur), tid, judge1, "Marco")
	AddMember(cross(cur), tid, judge2, "Sara")
	AddMember(cross(cur), tid, judge3, "Leo")
	testing.SetOriginSend(chain.Coins{{"ugnot", stake + bond}})
	bid := CreateBet(cross(cur), tid, "Alice beats Bob, 10 min blitz", "Bob", stake)
	testing.SetRealm(testing.NewUserRealm(bob))
	AcceptBet(cross(cur), bid)
	testing.SetOriginSend(nil)
	Report(cross(cur), bid, "b")
	testing.SetRealm(testing.NewUserRealm(alice))
	Report(cross(cur), bid, "a")
	testing.SetRealm(testing.NewUserRealm(judge1))
	Vote(cross(cur), bid, "a")
	testing.SetRealm(testing.NewUserRealm(judge2))
	Vote(cross(cur), bid, "a")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{"ugnot", stake + bond}})
	CreateBet(cross(cur), tid, "Anyone up for darts?", "anyone", stake)
	pid := CreatePool(cross(cur), tid, "Poker night", "Bob,Leo", stake, "60,40", true)
	println("=====HOME=====")
	println(Render(""))
	println("=====TABLE=====")
	println(Render("table/" + itoa(tid)))
	println("=====BET=====")
	println(Render("bet/" + itoa(bid)))
	println("=====BET2=====")
	println(Render("bet/2"))
	println("=====POOL=====")
	println(Render("pool/" + itoa(pid)))
	println("=====END=====")
}
